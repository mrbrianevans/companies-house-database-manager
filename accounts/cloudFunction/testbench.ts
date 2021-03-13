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
    const [, companyNumber, balanceSheetDate] = ['', 'test_comp_number', '2019-12-31']
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
                    if (!isNaN(data.value.replace(/,/g, '').trim())) data.value = data.value.replace(/,/g, '').trim()
                    if (facts.find(fact => factsEqual(fact, data)) || longFacts.find(fact => factsEqual(fact, data)))
                        console.log('duplicate fact:', data.label, data.value)
                    else if (data.value.length + data.label.length < 2000)
                        facts.push(data)
                    else longFacts.push(data)
                }
            })
            .on('end', () => {
                console.log("End event fired")
                resolve()
            })
            .on('error', (e) => reject(e.message))
    })
    facts.sort((a, b) => (new Date(b.end_date).valueOf() - new Date(a.end_date).valueOf()))
    Object.freeze(facts)
    console.log('facts length', facts.length)
    // console.log("Facts after frozen", facts)
    let dc = 1; //dollarCounter
    const multipleQuery = `
    INSERT INTO accounts 
    (company_number, name, label, context_ref, value, start_date, end_date, unit, decimals)
    VALUES 
    ${
        facts.slice(7, 15).map(fact =>
            ('(' +
                `$${dc++}, $${dc++}, ${fact.label ? `$${dc++}` : null},  $${dc++},  $${dc++}, ${fact.start_date ? `$${dc++}` : null}, ${fact.end_date ? `$${dc++}` : null}, ${fact.unit ? `$${dc++}` : null}, ${fact.decimals ? `$${dc++}` : null}`
                + ')')).join(',\n')
    };
    `
    //can't get returning to work :(
    const multipleValues = facts.slice(7, 15)
        .flatMap(fact => [fact.company_number, fact.name, fact.label, fact.context_ref, fact.value, fact.start_date, fact.end_date, fact.unit, fact.decimals])
        .filter(value => value !== undefined)
    // console.log(multipleQuery.replace(/\$[0-9]*/g, index => `'${multipleValues[Number(index.slice(1)) - 1]}'`))
    for (const fact of facts) {
        const accountsInsertSql = `
            INSERT INTO accounts (${Object.keys(fact).toString()})
            VALUES (${Array(Object.keys(fact).length).fill('$').map((e, i) => ('$' + (i + 1)))})
            ON CONFLICT ON CONSTRAINT accounts_pkey DO
            ${isNaN(fact.value) ? 'NOTHING' :
            'UPDATE SET value = CASE WHEN ABS(excluded.value::numeric) > ABS(accounts.value::numeric) THEN excluded.value ELSE accounts.value END'};`
        //this update should put the biggest absolute value in the accounts table
        // console.log('Sql statement: ', accountsInsertSql, Object.values(fact))
        // await pool.query(accountsInsertSql, Object.values(fact))
        //     .catch(e => {
        //         console.error("Error",
        //             e.message, "occurred when inserting", fact.value)
        //     })
    }

    const latestYearFacts = facts.filter(fact => fact.end_date == balanceSheetDate)
    const accountants = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Name of entity accountants')?.value
    const accounting_software = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Name of production software')?.value
    const employees = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Average number of employees during the period')?.value
    const current_assets = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Current assets')?.value
    const cash_at_bank = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Cash at bank and on hand')?.value
    const debtors = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Debtors')?.value
    const creditors = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Creditors')?.value
    const fixed_assets = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Fixed assets')?.value
    const net_assets = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Net current assets (liabilities)')?.value
    const equity = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Equity')?.value
    const profit = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Profit (loss)')?.value
    const borrowings = facts.find(fact => fact.end_date == balanceSheetDate && fact.label.match(/^Bank borrowings/))?.value //overdraft
    const revenue = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Turnover / revenue')?.value

    const total_assets_less_current_liabilities = facts.find(fact => fact.end_date == balanceSheetDate && fact.label == 'Total assets less current liabilities')?.value

    console.log(
        accountants,
        accounting_software,
        employees,
        current_assets,
        cash_at_bank,
        debtors,
        creditors,
        fixed_assets,
        net_assets,
        equity,
        profit,
        borrowings,
        revenue,
        total_assets_less_current_liabilities,
    )

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

interface IFact {
    label?: string,
    name: string,
    context_ref: string,
    value: string,
    company_number: string,
    start_date?: string,
    end_date: string,
    unit: string,
    decimals?: string
}

const factsEqual = (a: IFact, b: IFact) => {
    if ((a.name === b.name) &&
        (a.company_number === b.company_number) &&
        (a.end_date === b.end_date) &&
        (a.context_ref === b.context_ref)) {
        // the facts would violate the primary key at this point
        console.log(a.context_ref, '=', b.context_ref, a.label, a.value, '===', b.value, '?')
        return a.value === b.value // only identical if they have the same value
    }
    return false
}
