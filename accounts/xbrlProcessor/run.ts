import {Storage} from '@google-cloud/storage'
import {downloadAndUnzip} from "./downloadZip";

const run = async () => {
    const localStorage = new Storage();
    await localStorage.bucket('filter-facility-accounts').upload('/csv/filename.csv')
    //todo:
    // - set up folder structure (zipped, unzipped, csv)
    // - download a zip file
    // - upzip
    // - loop through folder
    // - call arelle on each file
    // - upload the csv to storage bucket
    // - insert into the accounts_scanned table
    // - delete the csv file locally
    // - delete the html file locally
    // - move onto the next file
    await downloadAndUnzip('Accounts_Monthly_Data-December2010.zip')
}

run()
    .catch(e => console.error("ERROR occured on main thread!:", e.message))
