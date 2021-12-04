// loop through accounts table, putting them into documents in mongo
import {Pool} from 'pg'
import QueryStream from "pg-query-stream";
import {convertCompanyAccountsDatabaseItemToItem} from "./ICompanyAccounts";
import {
  convertAccountsScannedDatabaseItemToItem,
  IAccountsScannedDatabaseItem,
  IAccountsScannedItem
} from "./IAccountsScanned";
import {MongoClient} from "mongodb";
import {getMongoClient} from "../getMongoClient";

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
  const pool = getDatabasePool()
  const client = await pool.connect()
  const mongo = await getMongoClient()

  const query = new QueryStream(`SELECT *
                                 FROM accounts_scanned
                                 ORDER BY company_number
                                 LIMIT 10`)
  const pgStream = client.query(query)
  await new Promise((resolve, reject) => {
    pgStream
      .on('data', async (a: IAccountsScannedDatabaseItem) => {
        pgStream.pause()
        const accountScanned = convertAccountsScannedDatabaseItemToItem(a)
        await loadAccountsIntoMongo({pool, accountScanned, mongo})
        pgStream.resume()
      })
      .on('end', resolve)
      .on('error', reject)
  })
  client.release()
  await pool.end()
  await mongo.close()

}

loadAccountsFromPostgres()

async function loadAccountsIntoMongo({
                                       pool,
                                       accountScanned,
                                       mongo
                                     }: { pool: Pool, accountScanned: IAccountsScannedItem, mongo?: MongoClient }) {
  const {companyNumber, accountsDate, numberOfFacts} = accountScanned
  const endDatePrev = formatDateEur(new Date(accountsDate.setUTCFullYear(accountsDate.getUTCFullYear() - 1)))
  const facts = await pool.query(
    `SELECT *
     FROM company_accounts
     WHERE company_number = $1
       AND (end_date = $2)`,
    [companyNumber, formatDateEur(accountsDate)]
  ).then(res => res.rows.map(i => convertCompanyAccountsDatabaseItemToItem(i)))

  console.log(facts.length, 'out of', numberOfFacts, 'facts for', companyNumber, formatDateEur(accountsDate))
  const document = {
    companyNumber,
    accountsDate,
    numberOfFacts,
    facts: facts.map(({label, value, startDate, endDate}) => ({
      label,
      value,
      startDate: startDate ?? undefined,
      endDate
    })).slice(0, 3)
  }
  await mongo?.db('bulk').collection('accounts').insertOne(document)
}

export const formatDateEur = (
  date: Date
) => {
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}