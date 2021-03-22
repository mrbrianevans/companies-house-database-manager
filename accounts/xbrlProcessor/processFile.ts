// use arelle to extract a CSV fact table from the XBRL file, upload to cloud bucket
const path = require('path');
const fs = require('fs');
import {Storage} from '@google-cloud/storage'

export const processHtmlFile: (xbrlFilename) => Promise<string> = async (xbrlFilename) => {
    return new Promise(async (resolve, reject) => {
        const [, dateFolder, companyNumber, year, month, day] = xbrlFilename.match(/.([0-9]{4}-[0-9]{2}-[0-9]{2}).Prod[0-9]{3}_[0-9]{4}_([A-Z0-9]{8})_([0-9]{4})([0-9]{2})([0-9]{2}).(xml|html)$/)
        const csvFolder = path.resolve(xbrlFilename, '..', '..', '..', 'facts', dateFolder)
        const csvBasename = companyNumber + '_' + year + '-' + month + '-' + day + '.csv'
        const csvFilename: string = path.resolve(csvFolder, csvBasename)
        // if (fs.existsSync(csvFilename)) resolve('skipped')
        if (!fs.existsSync(csvFolder)) fs.mkdirSync(csvFolder)
        const os = process.platform
        const arellePathname = path.resolve((os === 'win32' ? '/"Program Files"' : '/root'), 'Arelle', 'arelleCmdLine.' + (os === 'win32' ? 'exe' : 'py'))
        const columns = 'Label,Name,contextRef,Value,EntityIdentifier,Period,unitRef,Dec'
        const arelleCommand = (os === 'win32' ? '' : 'python3 ') + arellePathname + ' -f "' + xbrlFilename + '" --facts "' + csvFilename + '" --factListCols ' + columns

        const bucket = new Storage().bucket('filter-facility-accounts')
        const [alreadyUploaded] = await bucket.file(csvBasename).exists()
        if (alreadyUploaded) {
            // stops repeat work
            if (fs.existsSync(csvFilename)) fs.unlinkSync(csvFilename)
            // fs.unlinkSync(xbrlFilename)
            console.log("ALREADY UPLOADED??")
            resolve(csvFilename)
            return
        }
        if (fs.existsSync(csvFilename)) console.log("CSV already exists")
        if (!fs.existsSync(csvFilename)) require('child_process').execSync(arelleCommand, {timeout: 20000/*miliseconds*/})

        if (fs.existsSync(csvFilename)) {
            //upload the csv to Storage bucket, and delete it locally (xbrl and csv)
            try {
                const isConnected = await checkInternet()
                if (isConnected) {
                    await bucket.upload(csvFilename, {contentType: 'application/csv'})
                        .then(() => fs.unlinkSync(csvFilename))
                }
                fs.unlinkSync(xbrlFilename)
                resolve(csvFilename)
            } catch (e) {
                reject(e)
            }

        } else {
            reject('CSV file not found - ' + companyNumber)
        }
    })
}

const checkInternet = () => {
    try {
        return new Promise(resolve => {
            resolve(true)
            // require('dns').lookup('google.com', function (err) {
            //     if (err && err.code == "ENOTFOUND") {
            //         resolve(false);
            //     } else {
            //         resolve(true);
            //     }
            // })
        })
    } catch (e) {
        // do nothing with error
    }


};
