import {getArangoClient} from "./getArangoClient.js";
import {getMongoClient} from "./getMongoClient.js";
import type {BulkCompaniesCsvMongo, Company, EurDateString} from "./BulkCompaniesCsvMongo";

function convertDateFromChToEur(dateString: string): EurDateString {
  const [, day, month, year] = dateString.match(/(\d\d)\/(\d\d)\/(\d{4})/) ?? []
  // @ts-ignore not sure why this doesn't work? seems fine to me
  return `${Number(year)}-${Number(month).toString().padStart(2, '0')}-${Number(day).toString().padStart(2, '0')}`
}

function undefIfEmpty(str: string) {
  return str.length > 0 ? str : undefined
}

export async function loadDataFromMongo() {
  const arango = getArangoClient()
  const mongo = await getMongoClient('importer')
  const arangoCompanies = arango.collection('companies')
  const companies = mongo.db('bulk').collection<BulkCompaniesCsvMongo.Company>('companies').find()
  for await(const company of companies) {
    // @ts-ignore
    const newCompany: Company = {
      // @ts-ignore
      accounts: company.Accounts.AccountCategory === "NO ACCOUNTS FILED" ? undefined : {
        accountCategory: company.Accounts.AccountCategory,
        accountingReference: {day: company.Accounts.AccountRefDay, month: company.Accounts.AccountRefMonth},
        lastMadeUpTo: undefIfEmpty(company.Accounts.LastMadeUpDate) && convertDateFromChToEur(company.Accounts.LastMadeUpDate),
        nextDueDate: undefIfEmpty(company.Accounts.NextDueDate) && convertDateFromChToEur(company.Accounts.NextDueDate)
      },
      address: {
        addressLine1: company.RegAddress.AddressLine1,
        addressLine2: undefIfEmpty(company.RegAddress.AddressLine2),
        careOf: undefIfEmpty(company.RegAddress.CareOf),
        poBox: undefIfEmpty(company.RegAddress.POBox),
        country: undefIfEmpty(company.RegAddress.Country),
        county: undefIfEmpty(company.RegAddress.County),
        postCode: company.RegAddress.PostCode,
        postTown: undefIfEmpty(company.RegAddress.PostTown)
      },
      companyCategory: company.CompanyCategory,
      companyNumber: String(company.CompanyNumber).padStart(8, '0'),
      _key: String(company.CompanyNumber).padStart(8, '0'),
      companyStatus: company.CompanyStatus,
      // @ts-ignore
      confirmationStatement: (company.ConfStmtLastMadeUpDate.length + company.ConfStmtLastMadeUpDate.length) === 0 ? undefined : {
        lastMadeUpTo: undefIfEmpty(company.ConfStmtLastMadeUpDate) && convertDateFromChToEur(company.ConfStmtLastMadeUpDate),
        nextDueDate: undefIfEmpty(company.ConfStmtNextDueDate) && convertDateFromChToEur(company.ConfStmtNextDueDate)
      },
      countryOfOrigin: company.CountryOfOrigin,
      // @ts-ignore
      dissolutionDate: undefIfEmpty(company.DissolutionDate) && convertDateFromChToEur(company.DissolutionDate),
      incorporationDate: convertDateFromChToEur(company.IncorporationDate),
      limitedPartnerships: {generalPartners: company.LimitedPartnerships.NumGenPartners, limitedPartners: 0},
      mortgages: (company.Mortgages.NumMortCharges + company.Mortgages.NumMortOutstanding + company.Mortgages.NumMortSatisfied + company.Mortgages.NumMortPartSatisfied) > 0 ? {
        mortgageCharges: company.Mortgages.NumMortCharges,
        mortgagesOutstanding: company.Mortgages.NumMortOutstanding,
        mortgagesPartSatisfied: company.Mortgages.NumMortPartSatisfied,
        mortgagesSatisfied: company.Mortgages.NumMortSatisfied
      } : undefined,
      name: company.CompanyName,
      previousNames: [company.PreviousName_1, company.PreviousName_2, company.PreviousName_3, company.PreviousName_4, company.PreviousName_5, company.PreviousName_6, company.PreviousName_7, company.PreviousName_8, company.PreviousName_9, company.PreviousName_10].filter(PreviousName => PreviousName.CompanyName.length > 0).map(PreviousName => ({
        name: PreviousName.CompanyName,
        date: convertDateFromChToEur(PreviousName.CONDATE)
      })),
      // @ts-ignore
      returns: (company.Returns.NextDueDate.length + company.Returns.LastMadeUpDate.length) === 0 ? undefined : {
        lastMadeUpTo: undefIfEmpty(company.Returns.LastMadeUpDate) && convertDateFromChToEur(company.Returns.LastMadeUpDate),
        nextDueDate: undefIfEmpty(company.Returns.NextDueDate) && convertDateFromChToEur(company.Returns.NextDueDate)
      },
      sicCodes: company.SICCode.SicText_1 === "None Supplied" ? [] : [company.SICCode.SicText_1, company.SICCode.SicText_2, company.SICCode.SicText_3, company.SICCode.SicText_4].filter(sic => sic.length > 0).map(sic => sic.split('-')[0].trim())
    }
    console.time('Insert ' + newCompany.companyNumber)
    const res = await arangoCompanies.save(newCompany, {returnNew: true, overwriteMode: 'replace'})
    console.timeEnd('Insert ' + newCompany.companyNumber)
  }
  await arango.close()
  await mongo.close()
}