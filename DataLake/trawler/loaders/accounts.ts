import {getPostgresClient} from "../dbUtils/getPostgresClient.js";
import {getMongoClient} from "../dbUtils/getMongoClient.js";

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

    const accounts = mongo.db('bulk').collection<Accounts>('accounts').find().limit(50)

    console.log('Looping through accounts')
    // loop through all companies, inserting them into postgres
    for await (const account of accounts) {
        console.log(account.companyNumber, Date.now())

        const getFirstValue = (label: string) => {
            return account.facts.find(fact => fact.label == label)?.value ?? null
        }
        const getAllValues = (label: string) => {
            return account.facts.filter(fact => fact.label == label).map(fact => fact.value)
        }
        const getInstantValues = (label: string) => {
            return Object.fromEntries(account.facts.filter(fact => fact.label == label).map(fact => [fact.endDate, fact.value]))
        }

        const companyNumber = getFirstValue('UK Companies House registered number')
        const companyName = getFirstValue('Entity current legal or registered name')
        const officers = getAllValues('Name of entity officer')
        const equity = getInstantValues('Equity')
        const employees = getFirstValue('Average number of employees during the period')
        console.log({companyNumber, companyName, officers, equity})
//         await pool.query(`
//         INSERT INTO companies1
// (last_updated, company_name, company_number, incorporation_date, can_file, accounts_category,
//  latest_accounts_filing_id, balance_sheet_date, accountants, accounting_software, employees,
//  current_assets, cash_at_bank, debtors, creditors, fixed_assets, net_assets,
//  total_assets_less_current_liabilities, equity, revenue, profit, accounts_officers)
// VALUES (default, $1, $2, $3, TRUE, $5);
//         `)
    }

    await pool.end()
    await mongo.close()
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

