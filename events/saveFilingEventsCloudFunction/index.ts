import {Pool} from 'pg'
import * as request from "request";
import {FilingEvent} from "./eventTypes";
import {processFilingEvent} from "./processFilingEvent";

/**
 * Triggered from cloud scheduler (minimum daily)
 *
 * starts listening for filing events from the last timepoint saved
 * saves all new filing events to postgres database
 * quits when caught up backlog
 * console logs statistics
 */
const saveEventsToDb = () => {
    return new Promise<string>(async (resolve, reject) => {
        const pool = new Pool()
        let numberOfEventsSaved = 0;
        const startTime = Date.now()
        let dataBuffer = '' // stores incoming data until it makes a complete JSON object
        let {rows: latestTimepointRow} = await pool.query('SELECT timepoint FROM filing_events WHERE timepoint IS NOT NULL ORDER BY timepoint DESC LIMIT 1;')
        const reqStream = request.get('https://stream.companieshouse.gov.uk/filings' + (latestTimepointRow[0] ? ('?timepoint='+latestTimepointRow[0].timepoint): ''))
            .auth(process.env.APIUSER, '')
            .on('response', (r: any) => {
                if (r.statusCode !== 200) reject("Received a status code of " + r.statusCode)
            })
            .on('error', (e: any) => console.error(JSON.stringify({
                message: 'Error event in HTTP request to companies house filing',
                severity: 'ERROR',
                errorMessage: e.message,
                errorCode: e.code
            })))
            .on('data', async (d: any) => {
                if (d.toString().length > 1) {
                    reqStream.pause() // pauses receiving new information from companies house

                    dataBuffer += d.toString('utf8')
                    dataBuffer = dataBuffer.replace('}}{', '}}\n{')
                    while (dataBuffer.includes('\n')) {
                        let newLinePosition = dataBuffer.search('\n')
                        let jsonText = dataBuffer.slice(0, newLinePosition)
                        dataBuffer = dataBuffer.slice(newLinePosition + 1)
                        if (jsonText.length === 0) continue;
                        try {
                            let jsonObject: FilingEvent.FilingEvent = JSON.parse(jsonText)
                            await processFilingEvent(jsonObject, pool).then(() => {
                                numberOfEventsSaved++
                            }).catch(e => console.error(JSON.stringify({
                                message: `Could not process filing event`,
                                errorMessage: e.message,
                                errorCode: e.code,
                                severity: 'ERROR'
                            })))
                            // resolve when backlog is less than 5 minutes or execution time approaches 9 minutes
                            if (new Date(jsonObject.event.published_at).valueOf() > (Date.now() - (1000 * 60 * 5)) || Date.now() - startTime > 500 * 1000) {
                                resolve(JSON.stringify({
                                    message: "Saved " + numberOfEventsSaved + " events in " + (Math.round(Date.now() - startTime) / 1000) + " seconds." +
                                        " Averaged " + Math.round((Date.now() - startTime) / numberOfEventsSaved) + "ms per event",
                                    numberOfEventsSaved,
                                    executionTime: (Math.round(Date.now() - startTime) / 1000),
                                    averageTimePerEvent: Math.round((Date.now() - startTime) / numberOfEventsSaved),
                                    timeOfLastEventSaved: jsonObject.event.published_at,
                                    severity: "INFO",
                                    startedAtTimepoint: latestTimepointRow[0].timepoint,
                                    finishedAtTimepoint: jsonObject.event.timepoint
                                }))
                                return;
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError)
                                console.error(JSON.stringify({
                                    message: `COULD NOT PARSE json event`,
                                    eventJson: jsonText,
                                    severity: 'WARNING'
                                }))
                        }
                    }
                    reqStream.resume()// resumes receiving new information from companies house
                }
            })
            .on('end', () => reject("Stream ended"))
    }).then(console.log).catch(e => console.error(JSON.stringify({
        message: "Top level error",
        errorMessage: e
    })))
};

export {saveEventsToDb};
