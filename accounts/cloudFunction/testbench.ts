import * as fs from "fs";

const csv = require('csv-parser')
const path = require('path')

/**
 * Triggered from a file upload to a Cloud Storage bucket filter-facility-accounts.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
const uploadCsvToDb = async () => {
    const [, companyNumber] = ['', 'test_comp_number']
    const facts = []
    const longFacts = []
    await new Promise<void>(async (resolve, reject) => {
        fs
            .createReadStream(path.resolve(__dirname, 'test.csv'))
            .pipe(csv({mapHeaders: ({header}) => csvHeaders[header.trim()] || null}))
            .on('data', (data) => {
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
            .on('end', () => {
                console.log("End event fired")
                resolve()
            })
            .on('error', (e) => reject(e.message))
    })
    for (const fact of facts) {
        const accountsInsertSql = `
            INSERT INTO accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT accounts_pkey DO
            ${isNaN(fact.value) ? 'NOTHING' :
            'UPDATE SET value = CASE WHEN ABS(excluded.value::numeric) > ABS(accounts.value::numeric) THEN excluded.value ELSE accounts.value END'};`
        //this update should put the biggest absolute value in the accounts table
        console.log('Sql statement: ', accountsInsertSql, Object.values(fact))
        // await pool.query(accountsInsertSql, Object.values(fact))
        //     .catch(e => {
        //         console.error("Error",
        //             e.message, "occurred when inserting", fact.value)
        //     })
    }
    //todo: very long facts here

    // await pool.end()

};

uploadCsvToDb()

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
