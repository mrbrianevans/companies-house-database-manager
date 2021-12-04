import https from "https";
import {saveEventToMongo} from "./saveEventToMongo";
import tx2 from 'tx2'

const JSONStream = require('JSONStream')


export function listenToStream<EventType extends { resource_id: string }>(path = 'companies', getId: (e: EventType) => string = e => e.resource_id, startFromTimepoint?: number) {

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
    // Reporting Metrics:
    // - both of these metrics include duplicates (so higher than events saved in DB)
    // - the meter gives the average number of events per second during the last 5 minutes
    const counter = tx2.counter(`${path} events`)
    const meter = tx2.meter({name: `${path} events per sec`, samples: 1, timeframe: 300})
    res.pipe(JSONStream.parse())
      .on('data', () => counter.inc())
      .on('data', () => meter.mark())
      .on('data', saveEventToMongo(path, addId))
  })

  req.on('error', error => {
    console.error(`Error on ${path} stream`, error.name)
  })

  req.end()
}