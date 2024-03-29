import * as fs from "node:fs/promises";
import {ArelleDimensions, Concept} from "./ArelleJsonAccounts";

async function getDimensions(): Promise<Map<string, string>> {
  const dimensionsFilename = 'N:\\CompaniesHouse\\Accounts\\dimensions.json'
  const exists = await fs.stat(dimensionsFilename)
  if (exists) {
    const fileContents = await fs.readFile(dimensionsFilename)
    const object: Record<string, string> = JSON.parse(fileContents.toString())
    return new Map(Object.entries(object))
  } else {
    return new Map(Object.entries({None: 'None'}))
  }
}

async function reformatDimensions() {
  const fileContents = await fs.readFile('C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\financials\\ukbusDimensions.json')
  const dimensions: ArelleDimensions = JSON.parse(fileContents.toString('utf8'))

  const map: Map<string, string> = await getDimensions()
  /** recursive closure that adds entries to map */
  const readConcept = (concept: Concept) => {
    if (JSON.parse(concept[2].usable ?? 'false') || true) {
      map.set(concept[1].name.replace(/^.*:/, ''), concept[1].label)
    }
    for (const innerConcept of concept.slice(3) as Concept[]) {
      readConcept(innerConcept)
    }
  }

  console.log('dimensions.dimensions.length', dimensions.dimensions.length)
  for (const dimension of dimensions.dimensions) {
    console.log(dimension[0], dimension[1].definition, dimension[3].length)
    for (const innerConcept of dimension.slice(3) as Concept[]) {
      readConcept(innerConcept)
    }
  }
  console.log('Sample:', Object.fromEntries(Array.from(map.entries()).slice(0, 5)))


  const output = JSON.stringify(Object.fromEntries(map.entries()), null, 1)
  console.time('Write output file')
  const outputFile = 'N:\\CompaniesHouse\\Accounts\\dimensions.json'
  // const outputFile = 'C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\financials\\dimensions.json'
  await fs.writeFile(outputFile,
    output)
  console.timeEnd('Write output file')
}


reformatDimensions()
