// loop through accounts table, putting them into documents in mongo
import {Pool} from 'pg'
import QueryStream from "pg-query-stream";
import {convertCompanyAccountsDatabaseItemToItem} from "./ICompanyAccounts";
import {MongoClient, MongoError} from "mongodb";
import {getMongoClient} from "../getMongoClient";
import axios from "axios";
import {getCompaniesHouseRateLimit, RateLimitHeaders} from "./CompaniesHouseApi";
import {getPostgresPool} from "../getPostgresPool";
import {AccountsFacts, MongoAccounts} from "./MongoAccounts";
import {loadFilingEventsIntoPostgres} from "../getMissingFilingEvents";
import {attemptGetEventFromDb} from "./loadAccountsFromArelleJson";


async function loadAccountsFromPostgres() {
  console.log('Started loading accounts into mongo at', new Date())
  const pool = getPostgresPool()
  const client = await pool.connect()
  const mongo = await getMongoClient('importer')
  const query = new QueryStream(`SELECT company_number      AS "companyNumber",
                                        accounts_date::text AS "accountsDate",
                                        number_of_facts     AS "numberOfFacts",
                                        csv_scanned         AS "csvScanned"
                                 FROM accounts_scanned
                                 ORDER BY accounts_date DESC, company_number
                                 LIMIT 10000000`)
  const pgStream = client.query(query)
  await new Promise((resolve, reject) => {
    pgStream
      .on('data', async (a) => {
        pgStream.pause()
        const accountScanned = a
        await loadAccountsIntoMongo({pool, accountScanned, mongo}).catch(console.error)
        pgStream.resume()
      })
      .on('end', resolve)
      .on('error', reject)
  })
  client.release()
  // allows the last query to execute before closing the connection. Not sure how to wait for it, so sleep 1 second
  await new Promise(resolve => setTimeout(() => {
    pool.end().then(resolve)
  }, 1000))
  await mongo.close()
  console.log('Finished loading accounts into mongo at', new Date())
}

loadAccountsFromPostgres()

async function loadAccountsIntoMongo({
                                       pool,
                                       accountScanned,
                                       mongo
                                     }: { pool: Pool, accountScanned: { companyNumber: string, accountsDate: string, numberOfFacts: number, csvScanned: Date }, mongo?: MongoClient }) {
  const {companyNumber, accountsDate, numberOfFacts, csvScanned} = accountScanned
  const facts = await pool.query(
      `SELECT start_date::TEXT, label, value, end_date::TEXT
     FROM company_accounts
     WHERE company_number = $1
       AND captured BETWEEN ($2::TIMESTAMP - '1 second'::INTERVAL) AND ($2::TIMESTAMP + '1 second'::INTERVAL)`,
      [companyNumber, csvScanned]
    )
    .then(res => res.rows
      .map(i => convertCompanyAccountsDatabaseItemToItem(i))
      .map(f => {
        let newFact: AccountsFacts = {...f, endDate: f.endDate.toString(), startDate: f.startDate?.toString()}
        if (!newFact.startDate) delete newFact.startDate
        return newFact
      }))
  if (facts.length !== numberOfFacts) {
    console.log(facts.length, 'out of', numberOfFacts, 'facts for', companyNumber, accountsDate, 'scanned', csvScanned)
    return
  }

  let filingEvent = await attemptGetEventFromDb(companyNumber, accountsDate, pool)
  if (!filingEvent) {
    //only load filing events into postgres if the one being looked for doesn't already exist
    await loadFilingEventsIntoPostgres(companyNumber, pool)
    filingEvent = await attemptGetEventFromDb(companyNumber, accountsDate, pool)
  }
  if (!filingEvent) {
    console.log('Couldn\'t find filing event for', companyNumber, accountsDate)
    return
  }
  // filingEvent ??= await getFilingEventFromApi(companyNumber, accountsDate)
  const document: Omit<MongoAccounts, '_id'> = {
    companyNumber,
    accountsDate,
    numberOfFacts,
    ...filingEvent,
    facts
  }
  // console.log(document)
  try {
    await mongo?.db('bulk').collection('accounts').insertOne(document)
  } catch (e) {
    if (e instanceof MongoError && e.code != 11000) throw e
  }
}

async function getFilingEventFromApi(companyNumber: string, accountsDate: string) {
  console.log(`getFilingEventFromApi(companyNumber: ${companyNumber}, accountsDate: ${accountsDate})`)
  // list all filing events for this company
  const apiUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}/filing-history`
  const res = await axios
    .get(apiUrl, {
      auth: {username: process.env.APIUSER ?? '', password: ''}
    })
  const rateLimit = getCompaniesHouseRateLimit(res.headers)
  if (rateLimit.remain <= 2) await sleepRateLimit(rateLimit)
  // save all events in postgres database
  const filingHistory: IFilingHistory.IFilingHistory = res.data
  // return the one for accountsDate and category=accounts
}

async function sleepRateLimit(rateLimit: RateLimitHeaders) {
  console.log('Hit rate limit, sleeping', (rateLimit.reset - Date.now() / 1000).toFixed(1), 'milliseconds')
  await new Promise((resolve) => setTimeout(resolve, rateLimit.reset * 1000 - Date.now()))
}
