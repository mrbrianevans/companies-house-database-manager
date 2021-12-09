import {readdir, stat, unlink} from "fs/promises";
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
  //slice directories here to start where accounts_tracker left off
  const [, dirMonth, dirYear] = directory.match(/.Accounts_Monthly_Data-([a-zA-Z]+)(\d{4})/)
  // const sliceQuery = `SELECT company_number,
  //                            date_part('year', accounts_date)  AS y,
  //                            date_part('month', accounts_date) AS m,
  //                            date_part('day', accounts_date)   AS d
  //                     FROM accounts_tracker
  //                     WHERE bulk_year = $1
  //                       AND bulk_month = $2
  //                     ORDER BY company_number DESC
  //                     LIMIT 1 OFFSET 100;`
  // const sliceParams = [dirYear, dirMonth]
  // const lastDone = await pool.query(sliceQuery, sliceParams).then(res => res.rows[0]).then(row => new RegExp(`_${row.company_number}_${row.y}${row.m.toString().padStart(2, '0')}${row.d.toString().padStart(2, '0')}\.`))
  // console.log('Last done accounts were', lastDone.source)
  // const lastIndex = files.findIndex(name => name.match(lastDone))
  const lastIndex = 75_000 // this is a temporary fix to a problem where the most recent one done was deleted
  console.log(files.length, 'files in', dirMonth, dirYear, 'running in pid', process.pid, 'starting at', lastIndex)
  console.time(basename(directory))
  for (const [fileIndex, file] of Object.entries(files.slice(lastIndex))) {
    if (Number(fileIndex) % (files.length / 20) === 0) // every 5%, print a status update
      console.log('Done', fileIndex, 'files in', basename(directory), 'directory', new Date())
    const xbrlFilename = resolve(directory, file)
    await processXbrlFile(xbrlFilename, pool).catch(e => console.error('Error in files loop with file', basename(xbrlFilename), 'in', basename(directory), e))
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
  const alreadyScanned = csvExists || dbRowExists
  const insertQuery = `INSERT INTO accounts_tracker (company_number, accounts_date, csv_scanned, transaction_id,
                                                     in_postgres, bulk_year, bulk_month)
                       VALUES ($1, $2, $3, $4, $5, $6, $7)
                       ON CONFLICT ON CONSTRAINT accounts_tracker_pk DO UPDATE SET csv_scanned=excluded.csv_scanned,
                                                                                   transaction_id=excluded.transaction_id,
                                                                                   in_postgres=excluded.in_postgres`
  const insertParams = [companyNumber, accountsDate, alreadyScanned, transactionId, dbRowExists, dirYear, dirMonth]
  await pool.query(insertQuery, insertParams)
  // return 'scanned-with-arelle'

  if (alreadyScanned)
    setTimeout(() => unlink(xbrlFilename), 5000) // delete after 5 seconds if program is still running
}

run()
