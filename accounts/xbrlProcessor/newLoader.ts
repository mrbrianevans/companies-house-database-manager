/*
This is a new attempt at loading iXBRL files with less errors. The previous method of loading them to google cloud
caused errors when internet cut out. This is offline only and files can be separately uploaded using gsutil.

Plan:
- loop through all xbrl files
- check if they are already scanned to csv in the CSV folder
- check if they are in the postgres accounts table
- if neither of those, then add it to the to-do list for python Arelle
- check if it exists in the filing-events table, and if not, add it to a separate to-do list?

Saves status of each accounts file in the accounts_tracker table. Keeps track of if the facts are in DB, and filing event
 */
import {Pool} from 'pg'
import {readdir, stat} from 'fs/promises'
import {basename, resolve} from 'path'

const directoryOfDirectories = 'N:\\CompaniesHouse\\Accounts\\MonthlyBulk'
const csvDirectory = 'N:\\CompaniesHouse\\Accounts\\CSV'

async function load() {
  console.log('Started at', new Date())
  const directories = await readdir(directoryOfDirectories, {withFileTypes: true}).then(list => list.filter(item => item.isDirectory()).map(d => resolve(directoryOfDirectories, d.name)))
  const pool = getDatabasePool()
  for (const directory of directories) {
    const files = await readdir(directory)
    console.log(files.length, 'files in', basename(directory))
    if (files.length > 187000) continue
    console.time(basename(directory))
    for (const file of files) {
      const xbrlFilename = resolve(directory, file)
      await processXbrlFile(xbrlFilename, pool).catch(e => console.error('Error in files loop', e))
    }
    console.timeEnd(basename(directory))
  }
  console.log('Finished at', new Date())
}

load()

async function processXbrlFile(xbrlFilename: string, pool: Pool) {

  const [, dirMonth, dirYear, companyNumber, year, month, day] = xbrlFilename.match(/.Accounts_Monthly_Data-([a-zA-Z]+)(\d{4}).Prod[0-9]{3}_[0-9]{4}_([A-Z0-9]{8})_([0-9]{4})([0-9]{2})([0-9]{2}).(xml|html)$/)
  const accountsDate = `${year}-${month}-${day}`
  // console.log(dirMonth, dirYear, companyNumber, accountsDate)

  // check for transaction_id in filing_events table
  const filingQuery = `SELECT id
                       FROM filing_events
                       WHERE company_number = $1
                         AND description_values ->> 'made_up_date' = $2`
  const params = [companyNumber, accountsDate]
  const transactionId = await pool.query(filingQuery, params).then(res => res.rows[0]?.id)

  //check if already converted to CSV
  const csvExists = await stat(resolve(csvDirectory, `${companyNumber}_${accountsDate}.csv`)).then(e => true).catch(e => false)
  // if(csvExists) return 'csv-already-exists'

  //check if its already in postgres
  const query = `SELECT *
                 FROM accounts_scanned
                 WHERE company_number = $1
                   AND accounts_date = $2`
  const dbRowExists = await pool.query(query, params).then(res => res.rows.length > 0)
  // if(dbRowExists) return 'db-row-already-exists'

  // has not yet been scanned
  // console.log('Scanning', xbrlFilename, 'with Arelle')
  const insertQuery = `INSERT INTO accounts_tracker (company_number, accounts_date, csv_scanned, transaction_id,
                                                     in_postgres, bulk_year, bulk_month)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)
                       ON CONFLICT ON CONSTRAINT accounts_tracker_pk DO UPDATE SET csv_scanned=excluded.csv_scanned,
                                                                                   transaction_id=excluded.transaction_id,
                                                                                   in_postgres=excluded.in_postgres`
  const insertParams = [companyNumber, accountsDate, csvExists || dbRowExists, transactionId, dbRowExists, dirYear, dirMonth]
  await pool.query(insertQuery, insertParams)
  // return 'scanned-with-arelle'
}

const getDatabasePool = (): Pool => {
  return new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: Number(process.env.PGPORT)
  })
}
