import {processHtmlFile} from './processFile'

const axios = require("axios").default;

const processNextFile = async () => {
    const nextFileRequest = await axios.get('http://localhost:3000/next')
    if (nextFileRequest.status !== 200) {
        await new Promise<void>((resolve => setTimeout(resolve, 3000)))
        return; // wait three seconds and go back to the start of while loop
    }
    const filename = nextFileRequest.data
    await processHtmlFile(filename)
    const [, dateFolder, companyNumber] = filename.match(/.([0-9]{4}-[0-9]{2}-[0-9]{2}).Prod[0-9]{3}_[0-9]{4}_([A-Z0-9]{8})_([0-9]{4})([0-9]{2})([0-9]{2}).(xml|html)$/)
    return companyNumber
}

const runCore = async () => {
    console.log("Processing files on pid", process.pid)
    while (true) {
        let startTime = Date.now()
        await processNextFile()
            .then(async (r) => {
                if (r) {
                    let fileMetadata: FinishedFileMetadata = {
                        file: r,
                        time: Date.now() - startTime,
                        core: process.pid,
                        timestamp: Date.now()
                    }
                    await axios.post('http://localhost:3000/finished',
                        JSON.stringify(fileMetadata))
                }
            })
            .catch(async e => {
                await axios.post('http://localhost:3000/error', JSON.stringify(e))
            })
    }
}

runCore()

export interface FinishedFileMetadata {
    file: string,
    time: number,
    core: number,
    timestamp: number
}