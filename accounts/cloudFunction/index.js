"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCsvToDb = void 0;
const { Storage } = require('@google-cloud/storage');
const csv = require('csv-parser');
const pg_1 = require("pg");
/**
 * Triggered from a file upload to a Cloud Storage bucket filter-facility-accounts.
 *
 * reads the CSV file and loads the data in the postgres database
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
    const { rowCount: alreadyScanned } = await pool.query("SELECT * FROM accounts_scanned WHERE company_number=$1 AND accounts_date=$2", [companyNumber, balanceSheetDate]);
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
            .pipe(csv({ mapHeaders: ({ header }) => csvHeaders[header.trim()] || null }))
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
                if (!isNaN(data.value.replace(/,/g, '').trim()))
                    data.value = data.value.replace(/,/g, '').trim();
                //filter out duplicates before they hit the SQL
                if (facts.find(fact => factsEqual(fact, data)) || longFacts.find(fact => factsEqual(fact, data))) {
                    // console.log('duplicate fact:', data.label, data.value)
                }
                else if (data.value.length + data.label.length < 2000)
                    facts.push(data);
                else
                    longFacts.push(data);
            }
        })
            .on('end', async () => {
            // archive it when finished processing
            await uploadedFile.move(storage.bucket('filter-facility-accounts-csv-archive'))
                .then(() => console.info("Archived", gcsEvent.name))
                .catch(e => console.error("Failed to archive", filename, 'due to', e.message));
            resolve();
        })
            .on('error', (e) => reject(e.message));
    }).catch(e => console.error('Error occured during reading CSV:', e));
    //sort facts in descending chronological order
    facts.sort((a, b) => (new Date(b.end_date).valueOf() - new Date(a.end_date).valueOf()));
    //freeze facts from being modified
    Object.freeze(facts);
    let dc = 1; //dollarCounter
    const multipleQuery = `
    INSERT INTO company_accounts 
    (company_number, name, label, context_ref, value, start_date, end_date, unit, decimals)
    VALUES 
    ${facts.map(fact => ('(' +
        `$${dc++}, $${dc++}, ${fact.label !== undefined ? `$${dc++}` : null},  $${dc++},  $${dc++},` +
        `${fact.start_date !== undefined ? `$${dc++}` : null}, ${fact.end_date ? `$${dc++}` : null},` +
        `${fact.unit !== undefined ? `$${dc++}` : null}, ${fact.decimals !== undefined ? `$${dc++}` : null}`
        + ')')).join(',\n')}`;
    const multipleValues = facts
        .flatMap(fact => [fact.company_number, fact.name, fact.label, fact.context_ref,
        fact.value, fact.start_date, fact.end_date, fact.unit, fact.decimals])
        .filter(value => value !== undefined);
    let multiInsertError = undefined;
    let insertFactsStartTime = Date.now();
    await pool.query('INSERT INTO companies (number) VALUES ($1) ON CONFLICT DO NOTHING;', [companyNumber]);
    await pool.query(multipleQuery, multipleValues)
        .catch(e => multiInsertError = e.message);
    let factsInserted = multiInsertError ? 0 : facts.length, longFactsInserted = 0;
    if (factsInserted == 0) {
        console.log("Multi-insert failed after", Date.now() - insertFactsStartTime, 'ms');
        insertFactsStartTime = Date.now();
        for (const fact of facts) {
            const accountsInsertSql = `
            INSERT INTO company_accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT accounts_pkey DO
            ${isNaN(Number(fact.value)) ? "NOTHING" :
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
    const timeTakenToInsert = Date.now() - insertFactsStartTime;
    console.log(companyNumber, ':', factsInserted, 'facts inserted;', longFactsInserted, 'long facts inserted; in', timeTakenToInsert, 'ms. Average', Math.round(timeTakenToInsert / (factsInserted + longFactsInserted) * 10) / 10, 'ms per insert' + (multiInsertError ? '' : ', Multi-insert used'));
    //wide accounts table
    //todo: this need to make sure it gets the biggest absolute value that matches the filter!
    // const latestYearFacts = facts.filter(fact=>fact.end_date==balanceSheetDate)
    // const accountants =         facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Name of entity accountants')?.value
    // const accounting_software = facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Name of production software')?.value
    // const employees =           facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Average number of employees during the period')?.value
    // const current_assets =      facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Current assets')?.value
    // const cash_at_bank =        facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Cash at bank and on hand')?.value
    // const debtors =             facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Debtors')?.value
    // const creditors =           facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Creditors')?.value
    // const fixed_assets =        facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Fixed assets')?.value
    // const net_assets =          facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Net assets (liabilities)')?.value
    // const equity =              facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Equity')?.value
    // const profit =              facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Profit (loss)')?.value
    // const borrowings =          facts.find(fact=>fact.end_date==balanceSheetDate && fact.label.match(/^Bank borrowings/))?.value //overdraft
    // const revenue =             facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Turnover / revenue')?.value
    //
    // const total_assets_less_current_liabilities = facts.find(fact=>fact.end_date==balanceSheetDate && fact.label=='Total assets less current liabilities')?.value
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
const factsEqual = (a, b) => {
    if ((a.name === b.name) &&
        (a.company_number === b.company_number) &&
        (a.end_date === b.end_date) &&
        (a.context_ref === b.context_ref)) {
        // the facts would violate the primary key at this point
        // console.log(a.context_ref, '=', b.context_ref, a.label, a.value, '===' ,b.value, '?')
        return a.value === b.value; // only identical if they have the same value
    }
    return false;
};
