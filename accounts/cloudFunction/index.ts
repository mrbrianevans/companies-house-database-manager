const {Storage} = require('@google-cloud/storage')
const csv = require('csv-parser')
import {Pool} from 'pg'

/**
 * Triggered from a file upload to a Cloud Storage bucket filter-facility-accounts.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
const uploadCsvToDb = (event, context) => {
    const gcsEvent = event;
    console.log(`Processing file: ${gcsEvent.name}`);
    if (gcsEvent.name.slice(gcsEvent.name.length - 3) !== 'csv') {
        console.log("Not a csv, skipping")
        return;
    }
    const [companyNumber] = gcsEvent.name.match(/[A-Z0-9]{8}/)
    const storage = new Storage()
    const pool = new Pool({
        host: '/cloudsql/companies-house-data:europe-west1:filter-facility-db',
        port: 5432,
        database: 'postgres'
    })
    return new Promise<void>((resolve, reject) => {
        const csvReadStream = storage.bucket('filter-facility-accounts')
            .file(gcsEvent.name)
            .createReadStream()
            .pipe(csv({mapHeaders: ({header}) => csvHeaders[header.trim()] || null}))
            .on('data', async (data) => {
                await csvReadStream.pause()
                // dont insert null values or (reported) values
                for (let csvHeader in data)
                    if (data[csvHeader] == '' || data[csvHeader] === '(reported)') delete data[csvHeader]
                if (data.decimals === 'INF') data.decimals = 0
                data.company_number = companyNumber
                if (data.value && data.company_number && data.name && data.context_ref) {
                    // remove commas for type casting in postgres
                    if (!isNaN(data.value.replace(',', '').trim())) data.value = data.value.replace(',', '')
                    const accountsInsertSql = `INSERT INTO accounts (${Object.keys(data).toString()}) 
            VALUES (${Array(Object.keys(data).length).fill('$').map((e, i) => ('$' + (i + 1)))}) 
            ON CONFLICT ON CONSTRAINT accounts_pkey DO NOTHING;`
                    // for updating to a list use: UPDATE SET value=EXCLUDED.value||';'||accounts.value
                    await pool.query(accountsInsertSql, Object.values(data))
                        .catch(e => {
                            console.error("Error",
                                e.message, "occured when querying ",
                                accountsInsertSql, Object.values(data))
                        })
                }
                await csvReadStream.resume()
            })
            .on('end', async () => {
                await pool.query(`UPDATE accounts_scanned
                                  SET csv_scanned=current_timestamp
                                  WHERE company_number = $1;`, [companyNumber])
                resolve()
            })
            .on('error', (e) => reject(e.message))
    })
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
