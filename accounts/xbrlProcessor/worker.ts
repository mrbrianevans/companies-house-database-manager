// a worker just calls the HQ for the next filename, and then calls process on that file
import {processHtmlFile} from './processFile'

const axios = require("axios").default;
const baseUrl = 'http://localhost:' + (process.argv[2] || 3000)

const runCore = async () => {
    console.log("Processing files on pid", process.pid)
    while (true) {
        let startTime = Date.now()
        const nextFileRequest = await axios.get(baseUrl + '/next')
        if (nextFileRequest.status !== 200) {
            await new Promise<void>((resolve => setTimeout(resolve, 3000)))
            return; // wait three seconds and go back to the start of while loop
        }
        const filename: string = nextFileRequest.data
        if (filename === 'finished') break;
        await processHtmlFile(filename)
            .then(r => {
                const [filename] = r.match(/[A-Z0-9]{8}_[0-9]{4}-[0-9]{2}-[0-9]{2}.csv$/) || ['not found']
                return ({
                    file: filename,
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
                console.error('caught e', e)
                let errorDetails = {
                    message: e,
                    timestamp: Date.now()
                }
                await axios.post(baseUrl + '/error', JSON.stringify(errorDetails))
            })
    }
}

runCore().then(() => console.log("Worker", process.pid, 'finished'))

export interface FinishedFileMetadata {
    file: string,
    time: number,
    core: number,
    timestamp: number
}
