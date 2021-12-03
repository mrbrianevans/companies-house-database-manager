import https from "https";
import {saveEventToMongo} from "./saveEventToMongo";


export function listenToStream<EventType extends { resource_id: string }>(path = 'companies', getId: (e: EventType) => string = e => e.resource_id, startFromTimepoint?: number) {
  const JSONStream = require('JSONStream')

  const timepointQueryString = (typeof startFromTimepoint === "number") ? `?timepoint=${startFromTimepoint}` : ''
  const options: https.RequestOptions = {
    hostname: 'stream.companieshouse.gov.uk',
    port: 443,
    path: '/' + path + timepointQueryString,
    method: 'GET',
    auth: process.env.APIUSER + ':'
  }

  const req = https.request(options, res => {
    switch (res.statusCode) {
      case 200:
        console.log(path, 'Stream started')
        break;
      //  anything other than 200 causes exit
      case 416:
        console.log(path, `Timepoint '${startFromTimepoint}' out of date`)
      case 429:
        console.log(path, "RATE LIMITED, exiting now")
      default:
        console.log(path, 'STATUS', res.statusCode, res.statusMessage, '| Exiting program')
        process.exit(1) // cannot continue if a weird status code is returned
    }

    const addId = (e: EventType) => ({...e, _id: getId(e)})
    res.pipe(JSONStream.parse())
      .on('data', saveEventToMongo(path, addId))
  })

  req.on('error', error => {
    console.error(`Error on ${path} stream`, error.name)
  })

  req.end()
}