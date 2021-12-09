import {getPostgresPool} from "./getPostgresPool";
import {getCompaniesHouseRateLimit, RateLimitHeaders} from "./accounts/CompaniesHouseApi";
import axios from "axios";
import {FilingHistory} from "./accounts/IFilingEvents";
import {Pool} from "pg";
import tx2 from "tx2";

const camelCase = require('camelcase')
const snake = require('snakecase-keys')

const chunkArr = <T>(arr: T[], size: number): T[][] =>
// @ts-ignore
  arr.reduceRight((res, _, __, self) => [...res, self.splice(0, size)], [])

async function getMissingFilingEvents() {
  const query = `SELECT company_number
                 FROM accounts_tracker
                 WHERE transaction_id IS NULL
                 ORDER BY accounts_date
                 LIMIT 600`
  let list: string[]
  const companiesCounter = tx2.counter(`Companies`)
  const batchCounter = tx2.counter(`Batches of 600`)
  const filingCounter = tx2.counter(`Filing events`)
  do {
    const pool = getPostgresPool() // new pool after every 600 companies
    list = await pool.query(query).then((res) => res.rows.map((row) => row.company_number))
    for (const companyNumber of list) {
      try {
        const filingItem = await getFilingHistoryFromApi(companyNumber)
        if (filingItem.filing_history_status !== 'filing-history-available') {
          continue
        }
        const itemsReturned = filingItem.items.length
        if (itemsReturned !== filingItem.total_count)
          console.log(`Only returned ${itemsReturned}/${filingItem.total_count} filing events for ${companyNumber}`)

        for (const chunk of chunkArr(filingItem.items, 20)) {
          await Promise.all(chunk.map((item) => insertRawFilingEvent(item, companyNumber, pool)))
        }
        filingCounter.inc(itemsReturned)
        companiesCounter.inc()
      } catch (e) {
        console.log('Failed on companyNumber=', companyNumber, 'at', Date.now())
        console.error(e)
      }
    }
    await pool.end()
    batchCounter.inc()
  } while (list.length)


}

async function getFilingHistoryFromApi(companyNumber: string): Promise<FilingHistory.IFilingHistory> {
  const apiUrl = `https://api.company-information.service.gov.uk/company/${companyNumber}/filing-history?items_per_page=100&category=accounts`
  // console.log('GET', apiUrl)
  const res = await axios.get(apiUrl, {
    auth: {username: process.env.APIUSER ?? '', password: ''}
  }).catch(e => e.response)
  if (res.status !== 200) console.log('Response Status:', res.status, res.statusText)
  const rateLimit = getCompaniesHouseRateLimit(res.headers)
  if (rateLimit.remain <= 2) await sleepRateLimit(rateLimit)
  return res.data
}

async function sleepRateLimit(rateLimit: RateLimitHeaders) {
  const delay = Math.max(0, (rateLimit.reset * 1000 - Date.now())) + 10000
  console.log('Hit rate limit, sleeping', delay.toFixed(1), 'milliseconds')
  await new Promise((resolve) => setTimeout(resolve, delay))
}

async function insertRawFilingEvent(
  filingEvent: FilingHistory.FilingHistoryItem,
  companyNumber: string,
  pgPool?: Pool
) {
  const pool = pgPool ?? (await getPostgresPool())
  const formattedDescription = await formatFilingDescription(filingEvent.description, filingEvent.description_values ?? {}, pool)
  let insertParameters = [
    filingEvent.transaction_id,
    filingEvent.category,
    filingEvent.description,
    filingEvent.description_values ? snake(filingEvent.description_values) : null,
    formattedDescription,
    filingEvent.date,
    null,
    null,
    filingEvent.barcode,
    filingEvent.type,
    companyNumber
  ]
  await pool
    .query(
      `
          INSERT INTO filing_events
          (id, category, description_code, description_values, description, filing_date, timepoint,
           published, barcode, type, company_number)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET description_values=excluded.description_values,
                                         description=excluded.description;`,
      insertParameters
    )
    .catch((e) => console.error('ERROR:', e.message, 'DESCRIPTION: ', filingEvent.description))

  const updateQuery = `UPDATE accounts_tracker
                       SET transaction_id=$1
                       WHERE company_number = $2
                         AND accounts_date = $3`
  const updateParams = [filingEvent.transaction_id, companyNumber, filingEvent.action_date]
  const affected = await pool.query(updateQuery, updateParams).then(res => res.rowCount)
  if (affected > 1) console.log(affected, 'rows affected by UPDATE accounts_tracker')
  // if(affected === 1) console.log(updateParams)
  // console.log('Inserted event for companyNumber=', companyNumber, 'at', Date.now())
  if (!pgPool) await pool.end()
}

const formatFilingDescription: (
  descriptionCode: string,
  descriptionValues: Record<string, string>, pool: Pool
) => Promise<string> = async (descriptionCode, descriptionValues, pool: Pool) => {
  const {rows: descriptions, rowCount} = await pool.query(
    'SELECT value FROM filing_history_descriptions WHERE key=$1 LIMIT 1',
    [descriptionCode]
  )
  if (rowCount != 1) return camelCase(descriptionCode ?? '')
  const description = descriptions[0]['value']
  let formattedDescription = description.replace(
    /{([a-z_]+)}/g,
    (f: string, s: string) => descriptionValues?.[s] ?? ''
  )
  // console.log('original: ', descriptions[0].value, '\nformatted:', formattedDescription, 'values:', descriptionValues)
  return formattedDescription.toString()
}

getMissingFilingEvents()