import arangojs, {aql, CollectionType} from 'arangojs'

const db = arangojs({
  url: 'http://arango:8529',
  databaseName: 'prototype',
  auth: {username: 'root', password: process.env.ARANGO_ROOT_PASSWORD}
})

console.log(db.name)

const collections = await db.collections()
  .catch(e => console.error('Failed to list collections', e.message))

console.log({collections})

interface Company {
  companyNumber: string,
  name: string
}

const companies = await db.createCollection<Company>('companies', {type: CollectionType.DOCUMENT_COLLECTION})
  .catch(e => console.error('Failed to create companies collection', e.message))

const newCol = db.collection('testcol')

await newCol.save({name: 'CompaniesHouse', age: 71})
  .catch(e => console.error('Failed to save document to collection', e.message))

const documents = await db.query(aql`
FOR doc IN ${newCol}
  RETURN doc`)
  .catch(e => console.error('Failed to query documents in collection', e.message))

if (documents) for await(const doc of documents) {
  console.log({doc})
}

const version = await db.version()
  .catch(e => console.error('Failed to get arango version', e.message))

console.log(version)