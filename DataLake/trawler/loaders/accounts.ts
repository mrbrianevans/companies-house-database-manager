import {getPostgresClient} from "../dbUtils/getPostgresClient.js";
import {getMongoClient} from "../dbUtils/getMongoClient.js";
import {Counter} from '../Counter.js'
import {mutateObj} from "../utils/ArrayUtils.js";

interface Accounts {
    _id: string,
    companyNumber: string,
    accountsDate: string,
    numberOfFacts: number,
    descriptionCode: string,
    description: string,
    descriptionValues: { made_up_date: string },
    filingDate: string,
    barcode: string,
    type: string,
    facts: {
        "label": string,
        "value": string,
        "startDate"?: string,
        "endDate": string
    }[]
}

const sampleAccounts: Accounts = {
    "_id": "MzMwMjg2Mzc0NmFkaXF6a2N4",
    "companyNumber": "03377105",
    "accountsDate": "2021-05-31",
    "numberOfFacts": 18,
    "descriptionCode": "accounts-with-accounts-type-dormant",
    "description": "**Accounts for a dormant company** made up to 2021-05-31",
    "descriptionValues": {
        "made_up_date": "2021-05-31"
    },
    "filingDate": "2021-05-31",
    "barcode": "XA5NCXJL",
    "type": "AA",
    "facts": [
        {
            "label": "UK Companies House registered number",
            "value": "03377105",
            "startDate": "2020-06-01",
            "endDate": "2021-05-31"
        }
    ]
}

async function loadAccounts() {
    const pool = getPostgresClient()
    const mongo = await getMongoClient('importer')

    const accounts = mongo.db('bulk')
        .collection<Accounts>('accounts')
        //accounts-with-accounts-type-dormant, accounts-with-accounts-type-micro-entity, accounts-with-accounts-type-total-exemption-full
        .find({numberOfFacts: {$gt: 100}})
        .limit(50)
    const periodCounter = new Counter()
    const instantCounter = new Counter()
    console.log('Looping through accounts')
    // loop through all companies, inserting them into postgres
    for await (const account of accounts) {
        const instantLabels = new Set<string>()
        const periodLabels = new Set<string>()
        account.facts.forEach((fact) => {
            if ('startDate' in fact) {
                periodLabels.add(fact.label)
            } else {
                instantLabels.add(fact.label)
            }
        })
        periodLabels.forEach(label => periodCounter.increment(label))
        instantLabels.forEach(label => instantCounter.increment(label))

        // console.log(account.companyNumber, Date.now())

        const getFirstValue = (label: string) => {
            return account.facts.find(fact => fact.label == label)?.value ?? null
        }
        const getAllValues = (label: string) => {
            return Array.from(new Set(account.facts.filter(fact => fact.label == label).map(fact => fact.value)))
        }
        const getInstantValues = (label: string) => {
            return Object.fromEntries(account.facts.filter(fact => fact.label == label)
                .map(fact => [fact.endDate, fact.value.match(/^-?\d+$/) ? parseFloat(fact.value) : fact.value]))
        }
        const getAllPeriodValues = (label: string) => {
            return Object.fromEntries(account.facts.filter(fact => fact.label == label)
                .map(fact => [fact.endDate, fact.value]))
        }

        const financialLabels = Object.keys(filedInstantLabels)
        const financials: Record<typeof financialLabels[number], Record<string, string | number> | null> = Object.fromEntries(financialLabels.map(l => [l, null]));
        for (const [financial,] of Object.entries(filedInstantLabels)) {
            financials[financial] = getInstantValues(financial)
        }
        const periodValues: Record<string, Record<string, string | number> | null> = Object.fromEntries(Object.keys(filedPeriodLabels).map(l => [l, null]));
        for (const [label,] of Object.entries(filedPeriodLabels)) {
            periodValues[label] = getAllPeriodValues(label)
        }
        const capturedValues = {...periodValues, ...financials}
        const getOnlyValue = <T>(obj: Record<string, T> | null): T | null => {
            if (obj === null || obj === undefined) return obj
            if (account.accountsDate in obj) return obj[account.accountsDate]
            else if (Object.keys(obj).length === 1) return Object.values(obj)[0]
            else return null
            throw new Error('Cant find only value in ' + JSON.stringify(obj, null, 1))
        }
        const onlyValues = mutateObj(capturedValues, getOnlyValue)
        // console.log(onlyValues)

        const companyName = onlyValues['Entity current legal or registered name']
        const companyNumber = onlyValues['UK Companies House registered number']
        const officers = getAllValues('Name of entity officer')
        const postcode = onlyValues['Postal Code / Zip']
        const dormant = Boolean(onlyValues['Entity is dormant [true/false]'])
        const software = onlyValues['Name of production software']
        const accountants = onlyValues['Name of entity accountants']
        const employees = onlyValues['Average number of employees during the period']
        const endDate = onlyValues['End date for period covered by report']
        const balanceSheetDate = onlyValues['Balance sheet date']
        const startDate = onlyValues['Start date for period covered by report']
        const equity = onlyValues['Equity']
        const totalAssetsLessCurrentLiabilities = onlyValues['Total assets less current liabilities']
        const netAssets = onlyValues['Net assets (liabilities)']
        const netCurrentAssets = onlyValues['Net current assets (liabilities)']
        const currentAssets = onlyValues['Current assets']
        const creditors = onlyValues['Creditors']
        const revenue = onlyValues['Turnover / revenue']
        const profit = onlyValues['Profit (loss)']
        // console.log({companyName,companyNumber,officers,postcode,dormant,software,employees,endDate,
        // balanceSheetDate,startDate,equity,totalAssetsLessCurrentLiabilities,netAssets,netCurrentAssets,
        //     currentAssets,creditors,revenue,profit
        // })
        await pool.query(`
            INSERT INTO companies
            (last_updated, company_name, company_number, postcode, start_date, end_date, dormant,
             latest_accounts_filing_id, balance_sheet_date, accountants, accounting_software, employees,
             current_assets, creditors, net_assets, net_current_assets,
             total_assets_less_current_liabilities, equity, revenue, profit, accounts_officers)
            VALUES (default, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT ON CONSTRAINT companies_pkey DO NOTHING
            ;
        `, [companyName, companyNumber, postcode, startDate, endDate, dormant,
            account._id, balanceSheetDate, accountants,
            software, employees, currentAssets, creditors, netAssets, netCurrentAssets,
            totalAssetsLessCurrentLiabilities,
            equity, revenue, profit, officers])

    }

    await pool.end()
    await mongo.close()
}

const filedPeriodLabels = {
    'Entity is dormant [true/false]': 500,
    'Entity current legal or registered name': 500,
    'UK Companies House registered number': 500,
    'Name of entity officer': 498,
    'Name of production software': 483,
    'Name of entity accountants': 49,
    'Postal Code / Zip': 146,
}
const filedInstantLabels = {
    'Average number of employees during the period': 500, //this is actually a period value, but should be stored as an instant
    'End date for period covered by report': 500,
    'Balance sheet date': 500,
    'Start date for period covered by report': 500,
    Equity: 489,
    'Total assets less current liabilities': 483,
    'Net assets (liabilities)': 480,
    'Net current assets (liabilities)': 472,
    'Current assets': 446,
    Creditors: 430,
    'Turnover / revenue': 33,
    'Profit (loss)': 33,
}

await loadAccounts()

const bigSampleAccount: Accounts = {
    "_id": "MzMwMDgxMzU5NWFkaXF6a2N4",
    "companyNumber": "09095484",
    "accountsDate": "2021-04-30",
    "numberOfFacts": 45,
    "descriptionCode": "accounts-with-accounts-type-total-exemption-full",
    "description": "**Total exemption full accounts** made up to 2021-04-30",
    "descriptionValues": {"made_up_date": "2021-04-30"},
    "filingDate": "2021-05-12",
    "barcode": "XA4DFSYG",
    "type": "AA",
    "facts": [{
        "label": "Entity is dormant [true/false]",
        "value": "false",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Description of principal activities",
        "value": "No description of principal activity",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Name of production software",
        "value": "Taxfiler",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Version of production software",
        "value": "2021.4",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "UK Companies House registered number",
        "value": "09095484",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Entity current legal or registered name",
        "value": "CONTEMPORARY CARE LTD",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Report title",
        "value": "Unaudited accounts",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "End date for period covered by report",
        "value": "2021-04-30",
        "endDate": "2021-04-30"
    }, {
        "label": "Name of entity officer",
        "value": "MRS VICTORIA TAFADZWA CHOMA",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Name of entity officer",
        "value": "MR PAUL CHOMA",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Address line 1",
        "value": "5 TAYLOUR CLOSE",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Address line 2",
        "value": "COLWALL",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Principal location - city or town",
        "value": "MALVERN",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Postal Code / Zip",
        "value": "WR13 6RJ",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Name of entity accountants",
        "value": "BILBERRY ACCOUNTANTS LTD",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Balance sheet date",
        "value": "2021-04-30",
        "endDate": "2021-04-30"
    }, {
        "label": "Property, plant and equipment",
        "value": "25",
        "endDate": "2021-04-30"
    }, {
        "label": "Cash at bank and on hand",
        "value": "-4974",
        "endDate": "2021-04-30"
    }, {
        "label": "Net current assets (liabilities)",
        "value": "-4974",
        "endDate": "2021-04-30"
    }, {
        "label": "Total assets less current liabilities",
        "value": "-4949",
        "endDate": "2021-04-30"
    }, {"label": "Creditors", "value": "25000", "endDate": "2021-04-30"}, {
        "label": "Net assets (liabilities)",
        "value": "-29949",
        "endDate": "2021-04-30"
    }, {"label": "Equity", "value": "2", "endDate": "2021-04-30"}, {
        "label": "Equity",
        "value": "-29951",
        "endDate": "2021-04-30"
    }, {
        "label": "Equity",
        "value": "-29949",
        "endDate": "2021-04-30"
    }, {
        "label": "Statement that company entitled to exemption from audit under section 477 Companies Act 2006 relating to small companies",
        "value": "For the year ending 30 April 2021 the company was entitled to exemption from audit under section 477 of the Companies Act 2006 relating to small companies.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Statement that members have not required the company to obtain an audit",
        "value": "The members have not required the company to obtain an audit in accordance with section 476 of the Companies Act 2006.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Statement that directors acknowledge their responsibilities under the Companies Act",
        "value": "The directors acknowledge their responsibilities for complying with the requirements of the Act with respect to accounting records and the preparation of accounts.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Statement that accounts have been prepared in accordance with the provisions of the small companies regime",
        "value": "These accounts have been prepared and delivered in accordance with the provisions applicable to companies subject to the small companies' regime and in accordance with the provisions of FRS 102 Section 1A - Small Entities. The profit and loss account has not been delivered to the Registrar of Companies.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Date of authorisation of financial statements for issue",
        "value": "2021-05-10",
        "endDate": "2021-04-30"
    }, {
        "label": "Statement of compliance with applicable reporting framework",
        "value": "The accounts have been prepared in accordance with the provisions of FRS 102 Section 1A Small Entities. There were no material departures from that standard.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "General description of basis of measurement used in preparing financial statements",
        "value": "The accounts have been prepared under the historical cost convention as modified by the revaluation of certain fixed assets.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Functional and presentation currency policy",
        "value": "The accounts are presented in £ sterling.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Property, plant and equipment policy",
        "value": "Tangible assets are included at cost less depreciation and impairment. Depreciation has been provided at the following rates in order to write off the assets over their estimated useful lives:",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Property, plant and equipment policy",
        "value": "Straight line method at 25% p.a.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Property, plant and equipment policy",
        "value": "Straight line method at 25% p.a.",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Property, plant and equipment, gross / at cost",
        "value": "900",
        "endDate": "2021-04-30"
    }, {
        "label": "Increase from depreciation charge for the year, property, plant and equipment",
        "value": "225",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Accumulated depreciation and impairment, property, plant and equipment",
        "value": "875",
        "endDate": "2021-04-30"
    }, {"label": "Property, plant and equipment", "value": "25", "endDate": "2021-04-30"}, {
        "label": "Bank borrowings",
        "value": "25000",
        "endDate": "2021-04-30"
    }, {
        "label": "Average number of employees during the period",
        "value": "6",
        "startDate": "2020-05-01",
        "endDate": "2021-04-30"
    }, {
        "label": "Start date for period covered by report",
        "value": "2020-05-01",
        "endDate": "2020-04-30"
    }, {
        "label": "Property, plant and equipment, gross / at cost",
        "value": "900",
        "endDate": "2020-04-30"
    }, {
        "label": "Accumulated depreciation and impairment, property, plant and equipment",
        "value": "650",
        "endDate": "2020-04-30"
    }]
}

// these are facts that only have an endDate, no start date. they are measured at an instant in time
const instantFacts = [
    'Current assets',
    'Creditors',
    'End date for period covered by report',
    'Balance sheet date',
    'Intangible assets',
    'Property, plant and equipment',
    'Fixed assets',
    'Debtors',
    'Cash at bank and on hand',
    'Net current assets (liabilities)',
    'Total assets less current liabilities',
    'Creditors',
    'Net assets (liabilities)',
    'Equity',
    'Equity',
    'Date of authorisation of financial statements for issue',
    'Intangible assets, gross / at cost',
    'Accumulated amortisation and impairment, intangible assets',
    'Intangible assets',
    'Property, plant and equipment, gross / at cost',
    'Property, plant and equipment, gross / at cost',
    'Property, plant and equipment, gross / at cost',
    'Accumulated depreciation and impairment, property, plant and equipment',
    'Accumulated depreciation and impairment, property, plant and equipment',
    'Accumulated depreciation and impairment, property, plant and equipment',
    'Property, plant and equipment',
    'Property, plant and equipment',
    'Trade debtors / trade receivables',
    'Prepayments and accrued income',
    'Trade creditors / trade payables',
    'Bank borrowings and overdrafts',
    'Corporation tax, payable',
    'Value-added tax, payable',
    'Other creditors',
    'Amounts owed to directors',
    'Creditors',
    'Bank borrowings and overdrafts',
    'Start date for period covered by report',
    'Intangible assets',
    'Property, plant and equipment',
    'Fixed assets',
    'Debtors',
    'Cash at bank and on hand',
    'Current assets',
    'Creditors',
    'Net current assets (liabilities)',
    'Total assets less current liabilities',
    'Creditors',
    'Net assets (liabilities)',
    'Equity',
    'Equity',
    'Intangible assets, gross / at cost',
    'Accumulated amortisation and impairment, intangible assets',
    'Intangible assets',
    'Property, plant and equipment, gross / at cost',
    'Property, plant and equipment, gross / at cost',
    'Property, plant and equipment, gross / at cost',
    'Accumulated depreciation and impairment, property, plant and equipment',
    'Accumulated depreciation and impairment, property, plant and equipment',
    'Accumulated depreciation and impairment, property, plant and equipment',
    'Property, plant and equipment',
    'Property, plant and equipment',
    'Property, plant and equipment',
    'Trade debtors / trade receivables',
    'Prepayments and accrued income',
    'Trade creditors / trade payables',
    'Bank borrowings and overdrafts',
    'Corporation tax, payable',
    'Other creditors',
    'Creditors',
    'Bank borrowings and overdrafts'
]

