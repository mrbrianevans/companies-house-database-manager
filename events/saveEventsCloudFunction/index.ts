import {Pool} from 'pg'
import * as request from "request";
import {CompanyProfileEvent} from "./eventTypes";
import {processCompanyEvent} from "./processCompanyEvent";

/**
 * Triggered from cloud scheduler (minimum daily)
 *
 * starts listening for events from the last timepoint saved
 * saves all new events to postgres database
 * quits when caught up backlog
 * console logs statistics
 */
const saveEventsToDb = () => {
    return new Promise<string>(async (resolve, reject) => {
        const pool = new Pool()
        let numberOfEventsSaved = 0;
        const startTime = Date.now()
        let dataBuffer = '' // stores incoming data until it makes a complete JSON object
        let {rows: latestTimepointRow} = await pool.query('SELECT timepoint FROM company_events ORDER BY timepoint DESC LIMIT 1;')
        const reqStream = request.get('https://stream.companieshouse.gov.uk/companies?timepoint=' + latestTimepointRow[0].timepoint)
            .auth(process.env.APIUSER, '')
            .on('response', (r: any) => {
                if (r.statusCode !== 200) reject("Received a status code of " + r.statusCode)
            })
            .on('error', (e: any) => console.error('error event:', e.message))
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
                            let jsonObject: CompanyProfileEvent.CompanyProfileEvent = JSON.parse(jsonText)
                            await processCompanyEvent(jsonObject, pool).then(() => {
                                numberOfEventsSaved++
                            })
                            // resolve when backlog is less than 5 minutes or execution time approaches 9 minutes
                            if (new Date(jsonObject.event.published_at).valueOf() > (Date.now() - (1000 * 60 * 60 * 5)) || Date.now() - startTime > 500 * 1000)
                                resolve("Saved " + numberOfEventsSaved + " events in " + (Math.round(Date.now() - startTime) / 1000) + " seconds." +
                                    " Averaged " + Math.round((Date.now() - startTime) / numberOfEventsSaved) + "ms per event")
                        } catch (e) {
                            if (e instanceof SyntaxError)
                                console.error(`COULD NOT PARSE event: *${jsonText}*`)
                        }
                    }
                    reqStream.resume()// resumes receiving new information from companies house
                }
            })
            .on('end', () => reject("Stream ended"))
    }).then(console.log)
};

export {saveEventsToDb};
