"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCsvToDb = void 0;
const { Storage } = require('@google-cloud/storage');
const csv = require('csv-parser');
const pg_1 = require("pg");
/**
 * Triggered from a file upload to a Cloud Storage bucket filter-facility-accounts.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
const uploadCsvToDb = (event, context) => {
    return new Promise((resolve, reject) => {
        const gcsEvent = event;
        console.log(`Processing file: ${gcsEvent.name}`);
        const storage = new Storage();
        const uploadedFile = storage.bucket('filter-facility-accounts').file(gcsEvent.name);
        const nameFormatMatch = gcsEvent.name.match(/^([A-Z0-9]{8}).csv$/);
        if (!nameFormatMatch) {
            //delete file from storage bucket if doesn't match regexp
            uploadedFile.delete()
              .then(() => console.info("Deleted file", gcsEvent.name, 'due to not matching regexp'))
              .then(() => resolve)
              .catch((e) => console.error("Could not delete", gcsEvent.name, 'due to', e.message));
            return;
        }
        const [filename, companyNumber] = nameFormatMatch;
        const pool = new pg_1.Pool({
            host: '/cloudsql/companies-house-data:europe-west1:filter-facility-db',
            port: 5432,
            database: 'postgres'
        });
        const csvReadStream = uploadedFile
          .createReadStream()
          .pipe(csv({mapHeaders: ({header}) => csvHeaders[header.trim()] || null}))
          .on('data', async (data) => {
              await csvReadStream.pause();
              // dont insert null values or (reported) values
              for (let csvHeader in data)
                  if (data[csvHeader] == '' || data[csvHeader] === '(reported)')
                      delete data[csvHeader];
              if (data.decimals === 'INF')
                  data.decimals = 0;
            data.company_number = companyNumber;
            if (data.value && data.company_number && data.name && data.context_ref) {
                // remove commas for type casting in postgres
                if (!isNaN(data.value.replace(',', '').trim()))
                    data.value = data.value.replace(',', '').trim();
                const accountsInsertSql = `
                    INSERT INTO accounts (${Object.keys(data).toString()})
                    VALUES (${Array(Object.keys(data).length).fill('$').map((e, i) => ('$' + (i + 1)))})
                    ON CONFLICT ON CONSTRAINT accounts_pkey DO
                    ${isNaN(data.value) ? 'NOTHING' :
                  'UPDATE SET value = CASE WHEN ABS(excluded.value::numeric) > ABS(accounts.value::numeric) THEN excluded.value ELSE accounts.value END'};`;
                //this update should put the biggest absolute value in the accounts table
                await pool.query(accountsInsertSql, Object.values(data))
                  .catch(e => {
                      console.error("Error", e.message, "occured when inserting", data.value);
                      // accountsInsertSql, Object.values(data))
                  });
            }
            await csvReadStream.resume();
        })
            .on('end', async () => {
                await pool.query(`UPDATE accounts_scanned
                                  SET csv_scanned=current_timestamp
                                  WHERE company_number = $1;`, [companyNumber]);
                // archive it when finished processing
                await uploadedFile.move(storage.bucket('filter-facility-accounts-csv-archive'))
                  .catch(e => console.error("Failed to archive", filename, 'due to', e.message));
                resolve();
            })
            .on('error', (e) => reject(e.message));
    });
};
exports.uploadCsvToDb = uploadCsvToDb;
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
};
