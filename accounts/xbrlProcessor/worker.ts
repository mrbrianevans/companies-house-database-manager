// a worker just calls the HQ for the next filename, and then calls process on that file
import {processHtmlFile} from './processFile'

const axios = require("axios").default;
const baseUrl = 'http://localhost:' + (process.argv[2] ?? 3000)

const runCore = async () => {
    console.log("Processing files on pid", process.pid)
    while (true) {
        let startTime = Date.now()
        const nextFileRequest = await axios.get(baseUrl + '/next').catch(e => console.error('Error fetching next file to process', e))
        if (nextFileRequest?.status !== 200) {
            await new Promise<void>((resolve => setTimeout(resolve, 3000)))
            continue; // wait three seconds and go back to the start of while loop
        }
        const filename: string = nextFileRequest.data
        if (filename === 'finished') break;
        //console.debug('About to process', filename)
        await processHtmlFile(filename)
            .then(r => {
                const [csvFilename] = r.match(/[A-Z0-9]{8}_[0-9]{4}-[0-9]{2}-[0-9]{2}.csv$/) ?? ['not found']
                //console.debug('Finished processing', csvFilename)
                return ({
                    file: csvFilename,
                    time: Date.now() - startTime,
                    core: process.pid,
                    timestamp: Date.now()
                });
            })
            .then((fileMetadata: FinishedFileMetadata) => {
                return axios.post(baseUrl + '/finished',
                    JSON.stringify(fileMetadata))
            })
            .catch(async e => {
                console.error(new Date(), e)
                console.error('caught e', e.message)
                let errorDetails = {
                    message: e,
                    timestamp: Date.now()
                }
                await axios.post(baseUrl + '/error', JSON.stringify(errorDetails))
            })
        //console.debug('Finished iteration of while loop, starting again')
    }
}

runCore().then(() => console.log("Worker", process.pid, 'finished'))

export interface FinishedFileMetadata {
    file: string,
    time: number,
    core: number,
    timestamp: number
}
