// loop through accounts table, putting them into documents in mongo
import {Pool} from 'pg'
import QueryStream from "pg-query-stream";
import {convertCompanyAccountsDatabaseItemToItem} from "./ICompanyAccounts";
import {MongoClient, MongoError} from "mongodb";
import {getMongoClient} from "../getMongoClient";
import axios from "axios";
import {getCompaniesHouseRateLimit, RateLimitHeaders} from "./CompaniesHouseApi";

export const getDatabasePool = (): Pool => {
  return new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: Number(process.env.PGPORT)
  })
}

async function loadAccountsFromPostgres() {
  console.log('Started loading accounts into mongo at', new Date())
  const pool = getDatabasePool()
  const client = await pool.connect()
  const mongo = await getMongoClient('importer')
  const query = new QueryStream(`SELECT company_number      AS "companyNumber",
                                        accounts_date::text AS "accountsDate",
                                        number_of_facts     AS "numberOfFacts",
                                        csv_scanned         AS "csvScanned"
                                 FROM accounts_scanned
                                 ORDER BY accounts_date DESC, company_number
                                 LIMIT 1000000`)
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
  ).then(res => res.rows.map(i => convertCompanyAccountsDatabaseItemToItem(i)).map(({
                                                                                      label,
                                                                                      value,
                                                                                      startDate,
                                                                                      endDate
                                                                                    }) => ({
    label,
    value,
    startDate: startDate ?? undefined,
    endDate
  })).map(f => {
    if (!f.startDate) delete f.startDate
    return f
  }))
  if (facts.length !== numberOfFacts) {
    // console.log(facts.length, 'out of', numberOfFacts, 'facts for', companyNumber, accountsDate, 'scanned', csvScanned)
    return
  }

  const filingEvent = await pool.query(`
                      SELECT id AS                 _id,
                             description_code AS   "descriptionCode",
                             description,
                             description_values AS "descriptionValues",
                             filing_date::text  AS "filingDate",
                             barcode,
                             type
                      FROM filing_events
                      WHERE company_number = $1
                        AND description_values ->> 'made_up_date' = $2
      `,
      [companyNumber, accountsDate])
    .then(res => res.rows[0])
  if (!filingEvent) return
  // filingEvent ??= await getFilingEventFromApi(companyNumber, accountsDate)
  const document = {
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