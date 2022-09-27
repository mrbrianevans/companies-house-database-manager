import https from "https";
import {PscEvent} from "./eventTypes";

const JSONStream = require('JSONStream')

/**
 * Listens to a HTTPS stream of events from companies house on `path`, and calls `callback` with each one.
 * @param path - URL path to listen on. Defaults to `companies`. Can be `filings` or `persons-with-significant-control` etc.
 * @param callback - function to call on each event. Will call with the event data as the only parameter.
 * @param startFromTimepoint - timepoint to start from. If omitted, then will start from the latest event.
 */
export function listenToStream<EventType extends { resource_id: string }>(path = 'companies', callback: (e: EventType) => void = console.log, startFromTimepoint?: number) {
  if (!process.env.APIUSER) return console.error('APIUSER environment variable not set')
  const timepointQueryString = (typeof startFromTimepoint === "number") ? `?timepoint=${startFromTimepoint}` : ''
  const options: https.RequestOptions = {
    hostname: 'stream.companieshouse.gov.uk',
    port: 443,
    path: '/' + path + timepointQueryString,
    // method: 'GET',
    auth: process.env.APIUSER + ':'
  }

  const handleError = (e: Error) => console.error(`Error on ${path} stream`, '\x1b[31m', e.message, '\x1b[0m')
  https.request(options, res => {
    console.log(path, 'responded with STATUS', res.statusCode, res.statusMessage)
    res.pipe(JSONStream.parse())
      .on('data', callback)
      .on('error', handleError)
  }).on('error', handleError).end()
}

listenToStream<PscEvent.PscEvent>('filings', e => console.log(new Date(), e.resource_uri))
