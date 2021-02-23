const {Storage} = require('@google-cloud/storage')
const csv = require('csv-parser')
import {Pool} from 'pg'

/**
 * Triggered from a file upload to a Cloud Storage bucket filter-facility-accounts.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
const uploadCsvToDb = async (event, context) => {
    const gcsEvent = event;
    console.log(`Processing file: ${gcsEvent.name}`);
    const storage = new Storage()
    const uploadedFile = storage.bucket('filter-facility-accounts').file(gcsEvent.name)
    const nameFormatMatch = gcsEvent.name.match(/^([A-Z0-9]{8})_?([0-9]{4}-[0-9]{2}-[0-9]{2})?.csv$/)
    if (!nameFormatMatch) {
        //delete file from storage bucket if doesn't match regexp
        uploadedFile.delete()
            .then(() => console.info("Deleted file", gcsEvent.name, 'due to not matching regexp'))
            .catch((e) => console.error("Could not delete", gcsEvent.name, 'due to', e.message))
        return;
    }

    const [filename, companyNumber, balanceSheetDate] = nameFormatMatch
    const pool = new Pool({
        host: '/cloudsql/companies-house-data:europe-west1:filter-facility-db',
        port: 5432,
        database: 'postgres'
    })
    // this skips accounts previously scanned
    const {rowCount: alreadyScanned} = await pool.query("SELECT * FROM accounts_scanned WHERE company_number=$1 AND accounts_date=$2", [companyNumber, balanceSheetDate]);
    if (alreadyScanned) {
        console.log('Already scanned', companyNumber, balanceSheetDate)
        await uploadedFile.move(storage.bucket('filter-facility-accounts-csv-archive'))
            .catch(e => console.error("Failed to archive", filename, 'due to', e.message))
        return;
    }
    const facts = []
    const longFacts = []
    await new Promise<void>(async (resolve, reject) => {
        uploadedFile
            .createReadStream()
            .pipe(csv({mapHeaders: ({header}) => csvHeaders[header.trim()] || null}))
            .on('data', (data) => {
                // dont insert null values or (reported) values
                for (let csvHeader in data)
                    if (data[csvHeader] == '' || data[csvHeader] === '(reported)') delete data[csvHeader]
                if (data.decimals === 'INF') data.decimals = 0
                data.company_number = companyNumber
                if (data.value && data.company_number && data.name && data.context_ref) {
                    // remove commas for type casting in postgres
                    if (!isNaN(data.value.replace(',', '').trim())) data.value = data.value.replace(',', '').trim()
                    if (data.value.length + data.label.length < 2000) facts.push(data)
                    else longFacts.push(data)
                }
            })
            .on('end', async () => {
                // archive it when finished processing
                await uploadedFile.move(storage.bucket('filter-facility-accounts-csv-archive'))
                    .catch(e => console.error("Failed to archive", filename, 'due to', e.message))
                resolve()
            })
            .on('error', (e) => reject(e.message))
    }).catch(e => console.error('Error occured during reading CSV:', e))
        // const multipleQuery = `
        // INSERT INTO accounts (company_number, name, label, context_ref, value, start_date, end_date, unit, decimals)
        // VALUES ($1, $2, $3...);
        // `
        // pool.query(multipleQuery, facts, (e)=>resolve(e))
    let factsInserted = 0, longFactsInserted = 0, insertFactsStartTime = Date.now();
        for (const fact of facts) {
            const accountsInsertSql = `
            INSERT INTO accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT accounts_pkey DO
            ${isNaN(fact.value) ? 'NOTHING' :
                'UPDATE SET value = CASE WHEN ABS(excluded.value::numeric) > ABS(accounts.value::numeric) THEN excluded.value ELSE accounts.value END'};`
            //this update should put the biggest absolute value in the accounts table
            await pool.query(accountsInsertSql, Object.values(fact))
                .then(() => factsInserted++)
                .catch(e => {
                    console.error("Error",
                        e.message, "occurred when inserting", fact.value)
                })
        }
    // const {rowCount: companyInCompanies} = await pool.query("SELECT * FROM companies WHERE number=$1", [companyNumber]);
    //     if(!companyInCompanies)
    await pool.query('INSERT INTO companies (number) VALUES ($1) ON CONFLICT DO NOTHING;', [companyNumber])
    for (const fact of longFacts) {
        const accountsInsertSql = `
            INSERT INTO very_long_accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT very_long_accounts_pkey DO NOTHING;`
        //this update should put the biggest absolute value in the accounts table
        await pool.query(accountsInsertSql, Object.values(fact))
            .then(() => longFactsInserted++)
            .catch(e => {
                console.error("Error",
                    e.message, "occurred when inserting", fact.value)
            })
    }
    console.log(companyNumber, ':', factsInserted, 'facts inserted;',
        longFactsInserted, 'long facts inserted; in', Date.now() - insertFactsStartTime, 'ms')
    await pool.query(`INSERT INTO accounts_scanned (company_number, accounts_date, csv_scanned,
                                                    number_of_facts, number_of_long_facts)
                      VALUES ($1, $2, current_timestamp, $3, $4);`,
        [companyNumber, balanceSheetDate, factsInserted, longFactsInserted])
    await pool.end()
};

export {uploadCsvToDb};

const csvHeaders = {
    'Label': 'label',
    'Name': 'name',
    'contextRef': 'context_ref',
    'Value': 'value',
    'EntityIdentifier': 'company_number',
    'Start': 'start_date',
    'End/Instant': 'end_date',
    'unitRef': 'unit',
    'Dec': 'decimals'
}
