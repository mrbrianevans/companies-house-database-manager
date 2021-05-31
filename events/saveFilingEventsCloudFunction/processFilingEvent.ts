import {FilingEvent} from "./eventTypes";
import {Pool} from "pg";

export const processFilingEvent = async (filingEvent: FilingEvent.FilingEvent, pool: Pool) => {
    const companyNumber = filingEvent.resource_uri.match(/^\/company\/([A-Z0-9]{6,8})\/filing-history/)[1]
    // query enumeration map in database to figure out what the company has filed
    const {
        rows: descriptions,
        rowCount
    } = await pool.query("SELECT value FROM filing_history_descriptions WHERE key=$1 LIMIT 1", [filingEvent.data.description])
    // console.log('Process filing history',{"Database response": descriptions})
    if (rowCount !== 1) return // can't find description in database (rare)
    const description = descriptions[0]['value']
    let formattedDescription = description.replace(/{([a-z_]+)}/g, (s) => filingEvent.data.description_values ? filingEvent.data.description_values[s.slice(1, s.length - 1)] || '' : '')
    // VERY BAD IDEA TO PUT HTML INTO THE DATABASE!!
    // formattedDescription = formattedDescription.replace(/^\*\*/, '<b>')
    // formattedDescription = formattedDescription.replace(/\*\*/, '</b>')
    // SAVE EVENT TO DATABASE
    // it seems to be getting each event twice, which causes a problem for the primary key when it tries to insert the same row again. thats why there is on conflict do nothing. this is a short term fix
    // duplicates have been fixed by making id the primary key
    let insertParameters = [filingEvent.resource_id, filingEvent.data.category, filingEvent.data.description, filingEvent.data.description_values, formattedDescription, filingEvent.data.date, filingEvent.event.timepoint, filingEvent.event.published_at, filingEvent.data.barcode, filingEvent.data.type, companyNumber]
    await pool.query(`
        INSERT INTO filing_events
        (id, category, description_code, description_values, description, filing_date, timepoint,
         published, barcode, type, company_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT DO NOTHING;`, insertParameters)

}
