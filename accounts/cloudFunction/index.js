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
const uploadCsvToDb = async (event, context) => {
    const gcsEvent = event;
    console.log(`Processing file: ${gcsEvent.name}`);
    const storage = new Storage();
    const uploadedFile = storage.bucket('filter-facility-accounts').file(gcsEvent.name);
    const nameFormatMatch = gcsEvent.name.match(/^([A-Z0-9]{8})_?([0-9]{4}-[0-9]{2}-[0-9]{2})?.csv$/);
    if (!nameFormatMatch) {
        //delete file from storage bucket if doesn't match regexp
        uploadedFile.delete()
          .then(() => console.info("Deleted file", gcsEvent.name, 'due to not matching regexp'))
          .catch((e) => console.error("Could not delete", gcsEvent.name, 'due to', e.message));
        return;
    }
    const [filename, companyNumber, balanceSheetDate] = nameFormatMatch;
    const pool = new pg_1.Pool({
        host: '/cloudsql/companies-house-data:europe-west1:filter-facility-db',
        port: 5432,
        database: 'postgres'
    });
    // this skips accounts previously scanned
    const {rowCount: alreadyScanned} = await pool.query("SELECT * FROM accounts_scanned WHERE company_number=$1 AND accounts_date=$2", [companyNumber, balanceSheetDate]);
    if (alreadyScanned) {
        console.log('Already scanned', companyNumber, balanceSheetDate);
        await uploadedFile.move(storage.bucket('filter-facility-accounts-csv-archive'))
          .catch(e => console.error("Failed to archive", filename, 'due to', e.message));
        return;
    }
    const facts = [];
    const longFacts = [];
    await new Promise(async (resolve, reject) => {
        uploadedFile
          .createReadStream()
          .pipe(csv({mapHeaders: ({header}) => csvHeaders[header.trim()] || null}))
          .on('data', (data) => {
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
                  if (data.value.length + data.label.length < 2000)
                      facts.push(data);
                  else
                      longFacts.push(data);
              }
          })
          .on('end', async () => {
              // archive it when finished processing
              await uploadedFile.move(storage.bucket('filter-facility-accounts-csv-archive'))
                .catch(e => console.error("Failed to archive", filename, 'due to', e.message));
              resolve();
          })
          .on('error', (e) => reject(e.message));
    }).catch(e => console.error('Error occured during reading CSV:', e));
    let dc = 1; //dollarCounter
    const multipleQuery = `
    INSERT INTO accounts
    (company_number, name, label, context_ref, value, start_date, end_date, unit, decimals)
    VALUES
    ${facts.map(fact => ('(' +
      `$${dc++}, $${dc++}, ${fact.label ? `$${dc++}` : null},  $${dc++},  $${dc++},` +
      `${fact.start_date ? `$${dc++}` : null}, ${fact.end_date ? `$${dc++}` : null},` +
      `${fact.unit ? `$${dc++}` : null}, ${fact.decimals ? `$${dc++}` : null}`
      + ')')).join(',\n')};
    
    `;
    const multipleValues = facts
      .flatMap(fact => [fact.company_number, fact.name, fact.label, fact.context_ref,
          fact.value, fact.start_date, fact.end_date, fact.unit, fact.decimals])
      .filter(value => value !== undefined);
    let multiInsertError = undefined;
    const insertFactsStartTime = Date.now();
    await pool.query('INSERT INTO companies (number) VALUES ($1) ON CONFLICT DO NOTHING;', [companyNumber]);
    await pool.query(multipleQuery, multipleValues)
      .catch(e => multiInsertError = e.message);
    let factsInserted = multiInsertError ? 0 : facts.length, longFactsInserted = 0;
    if (factsInserted == 0) {
        for (const fact of facts) {
            const accountsInsertSql = `
            INSERT INTO accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT accounts_pkey DO
            ${isNaN(fact.value) ? 'NOTHING' :
              'UPDATE SET value = CASE WHEN ABS(excluded.value::numeric) > ABS(accounts.value::numeric) THEN excluded.value ELSE accounts.value END'};`;
            //this update should put the biggest absolute value in the accounts table
            await pool.query(accountsInsertSql, Object.values(fact))
              .then(() => factsInserted++)
              .catch(e => {
                  console.error("Error", e.message, "occurred when inserting", fact.value);
              });
        }
    }
    for (const fact of longFacts) {
        const accountsInsertSql = `
            INSERT INTO very_long_accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT very_long_accounts_pkey DO NOTHING;`;
        //this update should put the biggest absolute value in the accounts table
        await pool.query(accountsInsertSql, Object.values(fact))
          .then(() => longFactsInserted++)
          .catch(e => {
              console.error("Error", e.message, "occurred when inserting", fact.value);
          });
    }
    console.log(companyNumber, ':', factsInserted, 'facts inserted;', longFactsInserted, 'long facts inserted; in', Date.now() - insertFactsStartTime, 'ms');
    await pool.query(`INSERT INTO accounts_scanned (company_number, accounts_date, csv_scanned,
                                                    number_of_facts, number_of_long_facts, errors)
                      VALUES ($1, $2, current_timestamp, $3, $4, $5);`, [companyNumber, balanceSheetDate || new Date().toLocaleDateString(), factsInserted, longFactsInserted, multiInsertError]);
    await pool.end();
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
