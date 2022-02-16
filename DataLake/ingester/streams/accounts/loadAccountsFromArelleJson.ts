import * as fs from "node:fs/promises";
import * as path from "node:path";
import {ArelleJsonAccounts} from "./ArelleJsonAccounts";
import {MongoAccounts} from "./MongoAccounts";
import {loadFilingEventsIntoPostgres} from "../getMissingFilingEvents";
import {getPostgresPool} from "../getPostgresPool";
import {Readable} from 'stream';
import {Pool} from "pg";
// directory containing *only* JSON files from Arelle
const ROOT_DIR = 'N:\\CompaniesHouse\\Accounts\\JSON'
const OUT_DIR = 'N:\\CompaniesHouse\\Accounts\\MongoAccounts'

async function loadAccountsFromArelleJson(limit: null | number = null) {

  const dimensions = await getDimensions()
  console.time('Get list of files')
  // shuffle files to reduce chance of conflict. could be improved by keeping a Set of company numbers queried on the API
  const fileList = await getListOfFiles(limit).then(files => files.sort(() => Math.random() - 0.5))
  console.timeEnd('Get list of files')
  let fileCounter = 0
  const fileIterator: AsyncIterator<{ filename: string, facts: ArelleJsonAccounts }> = {
    async next() {
      if (fileCounter >= fileList.length) {
        return {done: true, value: null}
      }
      const filename = fileList[fileCounter++]
      // console.time('Get file')
      const facts = await getFile(filename)
      // console.timeEnd('Get file')
      const value = {facts, filename}
      return {value, done: false}
    }
  }
  const fileIterable = {
    [Symbol.asyncIterator]: () => fileIterator
  }
  console.time('Finished processing')
  const concurrency = 40
  // @ts-ignore
  const docs = Readable.from(fileIterable).map(({
                                                  facts,
                                                  filename
                                                }) => getMongoAccounts(convertArelleToMongoAccounts(facts, dimensions), filename), {concurrency})
  for await(const doc of docs) {
    await saveMongoAccounts(doc)
  }
  console.timeEnd('Finished processing')
  console.log("Processed", fileCounter, 'files')
}

async function getDimensions(): Promise<Map<string, string>> {
  const dimensionsFilename = 'N:\\CompaniesHouse\\Accounts\\dimensions.json'
  const fileContents = await fs.readFile(dimensionsFilename)
  const object: Record<string, string> = JSON.parse(fileContents.toString())
  return new Map(Object.entries(object))
}

async function getListOfFiles(limit: null | number): Promise<string[]> {
  const files = await fs.readdir(ROOT_DIR, {withFileTypes: true})
  const doneFiles = new Set(await fs.readdir(OUT_DIR))
  return files.filter(f => f.isFile()).filter(f => f.name).filter(f => !doneFiles.has(f.name)).map(f => f.name).slice(0, limit ?? undefined)
}

async function getFile(filepath: string) {
  return await fs.readFile(path.resolve(ROOT_DIR, filepath)).then(f => f.toString('utf8'))
    .then(s => JSON.parse(s))
}

function getOnlyValueOfObject(obj?: Record<string, string>) {
  return Object.entries(obj ?? {})?.[0]?.[1]
}

function renameDimensions(mapper: Map<string, string>, obj?: Record<string, string>) {
  if (!obj) return undefined
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => {
    const newKey = mapper?.get(key.replace(/^.*:/, ''))?.match(/^(?:\(via targetRole\) )?(?:x-)?(.+) \[.+]/)
    if (!newKey?.[1]) console.log('COUNT NOT REPLACE () for KEY: ' + key)
    const newValue = mapper?.get(value.replace(/^.*:/, ''))
    if (!newValue && value !== 'None') console.log('COULD NOT FIND VALUE: ' + value)
    //todo:
    // there are some dimensions not in the map yet:
    // COUNT NOT REPLACE () for KEY: char:CharityFundsDimension CharityFundsDimension undefined undefined
    // COULD NOT FIND VALUE: char:TotalRestrictedIncomeFunds
    // . b:CharityFundsDimension, uk-bus:ShareClassesDimension,uk-gaap-cd-bus:ShareClassesDimension
    // the char namespace for charities, also the ns22 namespace for charities, also the b namespace
    // see 00157327_2020-12-31 as an example. results in things like Trustee6 with no space
    return [newKey?.[1], newValue ?? value.replace(/^.*:/, '')]
  }))
}

function convertArelleToMongoAccounts(arelle: ArelleJsonAccounts, dimensions: Map<string, string>): MongoAccounts['facts'] {
  return arelle.factList.map(fact => {
    const newFact: MongoAccounts['facts'][number] = {
      label: fact[2].label, value: fact[2].value, endDate: fact[2].endInstant, startDate: fact[2].start
    }
    const factDimensions = renameDimensions(dimensions, fact[2].dimensions)
    const info = getOnlyValueOfObject(factDimensions)
    if (info) {
      // i decided it would be better to do this kind of processing on the frontend, as it results in information loss.
      // if (newFact.value === '(reported)') newFact.value = info
      // else if (Object.keys(factDimensions ?? {}).length === 1) newFact.info = info
      // else
      newFact.additionalInfo = factDimensions
    }

    return newFact
  }).map(f => {
    if (!f.startDate) delete f.startDate
    return f
  })
}

async function getMongoAccounts(facts: MongoAccounts['facts'], filename: string): Promise<MongoAccounts> {
  const filenameParts = filename.match(/^(.{8})_(\d{4}-\d{2}-\d{2}).json$/)
  if (!filenameParts) throw new Error('Filename doesnt match expected pattern: ' + filename)
  const [, companyNumber, accountsDate] = filenameParts
  const filingEvent = await getFilingEvent(companyNumber, accountsDate)
  return {
    ...filingEvent, accountsDate, companyNumber, facts, numberOfFacts: facts.length,
  }
}

async function attemptGetEventFromDb(companyNumber: string, accountsDate: string, pool: Pool) {
  return await pool.query(`
              SELECT id                 AS _id,
                     description_code   AS "descriptionCode",
                     description,
                     description_values AS "descriptionValues",
                     filing_date::text  AS "filingDate",
                     barcode,
                     type
              FROM filing_events
              WHERE company_number = $1
                AND description_values ->> 'made_up_date' = $2
    `, [companyNumber, accountsDate])
    .then(res => res.rows[0] as { _id: string, descriptionCode: string, description: string, descriptionValues: { made_up_date: string }, filingDate: string, barcode: string, type: string })
}

async function getFilingEvent(companyNumber: string, accountsDate: string) {
  // console.log('Getting filing event for', {companyNumber, accountsDate})
  const pool = getPostgresPool()
  let filingEvent = await attemptGetEventFromDb(companyNumber, accountsDate, pool)
  if (!filingEvent) {
    //only load filing events into postgres if the one being looked for doesn't already exist
    await loadFilingEventsIntoPostgres(companyNumber, pool)
    filingEvent = await attemptGetEventFromDb(companyNumber, accountsDate, pool)
  }
  await pool.end()
  if (!filingEvent) throw new Error(`Cant find filing event for companyNumber=${companyNumber} and accountsDate=${accountsDate}`)
  return filingEvent
}

async function saveMongoAccounts(accounts: MongoAccounts) {
  await fs.writeFile(path.resolve(OUT_DIR, `${accounts.companyNumber}_${accounts.accountsDate}.json`), JSON.stringify(accounts, null, 2))
}

// run main function
await loadAccountsFromArelleJson(100_000)




