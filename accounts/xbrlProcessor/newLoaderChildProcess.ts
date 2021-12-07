import {readdir, stat} from "fs/promises";
import {basename, resolve} from "path";
import {Pool} from "pg";

const csvDirectory = 'N:\\CompaniesHouse\\Accounts\\CSV'

const getDatabasePool = (): Pool =>
  new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    port: Number(process.env.PGPORT)
  })
const run = async () => {
  const directory = process.argv[2]
  const pool = getDatabasePool()
  const files = await readdir(directory)
  console.log(files.length, 'files in', basename(directory), 'running in pid', process.pid)
  console.time(basename(directory))
  for (const [fileIndex, file] of Object.entries(files)) {
    if (Number(fileIndex) % (files.length / 10) === 0) // every 10%, print a status update
      console.log('Done', fileIndex, 'files in', basename(directory), 'directory', new Date())
    const xbrlFilename = resolve(directory, file)
    await processXbrlFile(xbrlFilename, pool).catch(e => console.error('Error in files loop', basename(directory), e))
  }
  console.timeEnd(basename(directory))
};

async function processXbrlFile(xbrlFilename: string, pool: Pool) {
  const [, dirMonth, dirYear, companyNumber, year, month, day] = xbrlFilename.match(/.Accounts_Monthly_Data-([a-zA-Z]+)(\d{4}).Prod[0-9]{3}_[0-9]{4}_([A-Z0-9]{8})_([0-9]{4})([0-9]{2})([0-9]{2}).(xml|html)$/)

  const accountsDate = `${year}-${month}-${day}`
  // console.log(dirMonth, dirYear, companyNumber, accountsDate)

  const params = [companyNumber, accountsDate]
  const checkDoneQuery = `SELECT *
                          FROM accounts_tracker
                          WHERE company_number = $1
                            and accounts_date = $2`
  const alreadyChecked = await pool.query(checkDoneQuery, params).then(res => res.rows.length > 0)
  if (alreadyChecked) return

  // check for transaction_id in filing_events table
  const filingQuery = `SELECT id
                       FROM filing_events
                       WHERE company_number = $1
                         AND description_values ->> 'made_up_date' = $2`
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

run()
