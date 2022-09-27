import * as fs from "node:fs/promises";
import * as path from "node:path";
import {ArelleJsonAccounts} from "./ArelleJsonAccounts";
import {MongoAccounts} from "./MongoAccounts";
import {getFilingHistoryFromApi, loadFilingEventsIntoPostgres} from "../getMissingFilingEvents";
import {getPostgresPool} from "../getPostgresPool";
import {Readable} from 'stream';
import {Pool} from "pg";
import {MongoClient, ObjectId} from "mongodb";
import {FilingHistory} from "./IFilingEvents";
// directory containing *only* JSON files from Arelle
const ROOT_DIR = 'N:\\CompaniesHouse\\Accounts\\JSON'
const OUT_DIR = 'N:\\CompaniesHouse\\Accounts\\MongoAccounts'

async function loadAccountsFromArelleJson(limit: null | number = null) {

  const dimensions = await getDimensions()
  console.time('Get list of files')
  // shuffle files to reduce chance of conflict. could be improved by keeping a Set of company numbers queried on the API
  const fileList = await getListOfFiles(limit).then(files => files.sort(() => Math.random() - 0.5))
  console.timeEnd('Get list of files')
  console.log("Loading", fileList.length, "files from Arelle output into MongoAccounts JSON")
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
  const docs = Readable.from(fileIterable)
    // @ts-ignore
    .map(({facts, filename}) => {
      try {
        return getMongoAccounts(convertArelleToMongoAccounts(facts, dimensions), filename)
      } catch (e) {
        console.error("Failed on", filename, '\n', e)
        return Promise.resolve(false)
      }
    }, {concurrency})
  for await(const doc of docs) {
    if (!doc) continue
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
    //todo: this regex match should be moved to ./reformatDimensions.ts so that the saved map has the correct values
    const newKey = mapper?.get(key.replace(/^.*:/, ''))?.match(/^(?:\(via targetRole\) )?(?:x-)?(.+) \[.+]/)
    if (!newKey?.[1]) throw new Error('COUNT NOT REPLACE () for KEY: ' + key)
    const newValue = mapper?.get(value.replace(/^.*:/, ''))
    if (!newValue && value !== 'None') throw new Error('COULD NOT FIND VALUE: ' + value)
    //todo:
    // there are some dimensions not in the map yet: uk-gaap-cd-bus:ShareClassesDimension
    // charities have been added. the process for adding one is to download the XBRL from companies house,
    // run this comman in arelle:
    // financials\unzipped>"C:\Program Files\Arelle\arelleCmdLine.exe" -f 00157327_aa_2021-10-01.xhtml -v --dim ..\{new}Dimensions.json
    // and then run reformatDimensions, setting {new}Dimensions.json as the file to load.
    // it appends to the existing map.
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

async function getMongoAccounts(facts: MongoAccounts['facts'], filename: string): Promise<MongoAccounts | false> {
  try {
    const filenameParts = filename.match(/^(.{8})_(\d{4}-\d{2}-\d{2}).json$/)
    if (!filenameParts) throw new Error('Filename doesnt match expected pattern: ' + filename)
    const [, companyNumber, accountsDate] = filenameParts
    const filingEvent = await getFilingEventPostgres(companyNumber, accountsDate)
    return {
      ...filingEvent, accountsDate, companyNumber, facts, numberOfFacts: facts.length,
    }
  } catch (e) {
    console.error('Failed in getMongoAccounts on ' + filename)
    console.error(e)
    return false
  }
}

export async function attemptGetEventFromDb(companyNumber: string, accountsDate: string, pool: Pool) {
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

const e = {
  _id: new ObjectId("625809fbd0858dabca1c2c93"),
  id: 'MjA0MDcwNDIwN2FkaXF6a2N4',
  category: 'gazette',
  description_code: 'gazette-notice-voluntary',
  description: '**First Gazette** notice for voluntary strike-off',
  description_values: '',
  filing_date: '2009-09-15',
  timepoint: 53854152,
  published: '2021-03-22 14:15:20',
  captured: '2021-03-22 17:00:35.415144',
  barcode: '',
  type: 'GAZ1(A)',
  company_number: 5671014
}

async function getFilingEventPostgres(companyNumber: string, accountsDate: string) {
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

async function getFilingEventMongo(companyNumber: string, accountsDate: string) {
  const coll = await getCollection()
  let event = await coll.findOne({companyNumber, accountsDate})
  if (event) return event
  // else
  await loadFilingEventsIntoMongo(companyNumber)
  event = await coll.findOne({companyNumber, accountsDate})
  if (event) return event
  else throw new Error('Could not find event for company: ' + companyNumber)
}

async function getCollection() {
  const mongo = await mongoClient()
  return mongo.db('api-cache').collection<FilingHistory.FilingHistoryItem>('filing_events')
}

async function loadFilingEventsIntoMongo(companyNumber: string) {
  try {
    const coll = await getCollection()
    const filingItem = await getFilingHistoryFromApi(companyNumber)
    if (filingItem.filing_history_status !== 'filing-history-available') {
      console.log("Filing history unavailable for", companyNumber)
      return null
    }
    const itemsReturned = filingItem.items.length
    if (itemsReturned !== filingItem.total_count)
      console.log(`Only returned ${itemsReturned}/${filingItem.total_count} filing events for ${companyNumber}`)
    await coll.insertMany(filingItem.items)
    return {itemsReturned}
  } catch (e) {
    console.log('Failed to load accounts into Mongo on companyNumber=', companyNumber, 'at', Date())
    console.error(e)
  }
}

async function saveMongoAccounts(accounts: MongoAccounts) {
  await fs.writeFile(path.resolve(OUT_DIR, `${accounts.companyNumber}_${accounts.accountsDate}.json`), JSON.stringify(accounts, null, 2))
}

// run main function
await loadAccountsFromArelleJson(1_000_000)

async function mongoClient() {
  const client = new MongoClient('mongo://localhost:27017')
  await client.connect()
  return client
}
