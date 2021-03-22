import {Storage} from "@google-cloud/storage";
import * as fs from "fs";

const uploadAndDelete = async (folder: string, filename: string) => {
    if (fs.existsSync(folder + "/" + filename)) {
        //upload the csv to Storage bucket, and delete it locally (xbrl and csv)
        const bucket = new Storage().bucket('filter-facility-accounts')
        // delete locally if exists on server. else upload and then delete
        const [alreadyUploaded] = await bucket.file(filename).exists()
        // console.log()
        if (alreadyUploaded) {
            // console.log("Deleting locally without uploading because it already exists in bucket")
            fs.unlinkSync(folder + "/" + filename)
        } else {
            // console.log("Deleting after uploading")
            await bucket.upload(folder + "/" + filename, {contentType: 'application/csv'})
                .then(() => fs.unlinkSync(folder + "/" + filename))
                // .then(()=>console.log("Uploaded successfulyy"))
                .catch(console.error)
        }
    } else {
        console.error("Cannot find CSV file")
    }
}

const wholeFolder = async (folderName) => {
    const files = fs.readdirSync(folderName)
    const startTime = Date.now()
    for (const fileIndex in files) {
        process.stdout.clearLine(0)
        process.stdout.cursorTo(0)
        process.stdout.write(fileIndex + " files uploaded/deleted in " + Math.round(Date.now() - startTime) / 1000 + " seconds " +
            "( " + Math.round(Number(fileIndex) / (Date.now() - startTime) * 10000) / 10 + " ) per second")
        await uploadAndDelete(folderName, files[fileIndex])
    }
}
console.time("Processing " + process.argv[2])
wholeFolder(process.argv[2]).then(() => console.timeEnd("Processing " + process.argv[2]))
