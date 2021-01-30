const fs = require('fs');
const path = require('path')
const csv = require('csv-parser')
const {Pool} = require("pg");
const pool = new Pool({
    ssl: {
        rejectUnauthorized: false,
        require: true
    }
});
// takes the name of a folder containing XBRL files as its argument
const folderName = process.argv[2]

// upload accounts to database from html file (abs path)
const processHtmlFile = async (xbrlFilename) => {
    return new Promise(async (resolve, reject) => {
      const client = await pool.connect()
      // use arelle to extract a CSV fact table from the XBRL file
      const [, dateFolder, companyNumber, year, month, day, fileExtension] = xbrlFilename.match(/.([0-9]{4}-[0-9]{2}-[0-9]{2}).Prod[0-9]{3}_[0-9]{4}_([A-Z0-9]{8})_([0-9]{4})([0-9]{2})([0-9]{2}).(xml|html)$/)
      const [shortFileName] = xbrlFilename.match(/Prod[0-9]{3}_[0-9]{4}_[A-Z0-9]{8}_[0-9]{4}[0-9]{2}[0-9]{2}.(xml|html)$/)
      const {rowCount: alreadyScannedFile} = await client.query("SELECT * FROM accounts_scanned WHERE filename=$1", [shortFileName])
      if (alreadyScannedFile) {
        await client.release()
        resolve('skip') // proceed no further if the file has already been scanned, becuase new inputs are appended
        return;
      } else {
        const insertedRowCount = await client.query("INSERT INTO accounts_scanned (filename, company_number, accounts_date, status, zip_file_date) VALUES ($1, $2, $3, 'busy', $4);", [shortFileName, companyNumber, new Date(year, Number(month) - 1, day), dateFolder])
          .catch(async (e) => {
            await client.release()
            reject(e)
          })
        if (insertedRowCount === undefined || insertedRowCount === '(intermediate value)') { // couldn't insert row means someone else got there first
          console.log('CURRENT TIME', new Date().toLocaleString())
          return
        }
        // console.log("Found", alreadyScannedFile, "copies of this filing in accounts_scanned for", companyNumber)
      }
  
      const csvFolder = path.resolve(xbrlFilename, '..', '..', '..', 'facts', dateFolder)
      if (!fs.existsSync(csvFolder)) fs.mkdirSync(csvFolder)
      const csvFilename = path.resolve(csvFolder, companyNumber + '.csv')
      const os = process.platform
      const arellePathname = path.resolve((os === 'win32' ? '/"Program Files"' : '/root'), 'Arelle', 'arelleCmdLine.' + (os === 'win32' ? 'exe' : 'py'))
      const columns = 'Label,Name,contextRef,Value,EntityIdentifier,Period,unitRef,Dec'
      const arelleCommand = (os === 'win32' ? '' : 'python3 ') + arellePathname + ' -f ' + xbrlFilename + ' --facts ' + csvFilename + ' --factListCols ' + columns
      // console.time('Running arelle')
      // console.timeLog("Running arelle", arelleCommand)
      require('child_process').execSync(arelleCommand, {timeout: 20000/*miliseconds*/})
      //todo: try an async version of exec so that I can run multithreaded from the same node process
      // require('child_process').exec(arelleCommand, ()=>{})
      // console.timeEnd('Running arelle')
      const csvReadStream = fs.createReadStream(csvFilename)
        .pipe(csv({mapHeaders: ({header}) => csvHeaders[header.trim()] || null}))
        .on('data', async (data) => {
          await csvReadStream.pause()
          for (let csvHeader in data) {
            if (data[csvHeader] == '' || data[csvHeader] === '(reported)') delete data[csvHeader]
          }
          if (data.decimals === 'INF') data.decimals = 0
          // data.company_number = data.company_number.padStart(8, '0')
          data.company_number = companyNumber // use the company number from file name because for some reason some accounts dont list it apparently
          if (data.value && data.company_number && data.name && data.context_ref) { // dont insert null values or (reported) values
            if (!isNaN(data.value.replace(',', '').trim())) data.value = data.value.replace(',', '') // remove commas for type casting in postgres
            //on conflict, it will add the second value to the end of the original value. this is for directors name etc. DO NOT RUN THE SAME FILE THROUGH TWICE, IT WILL RUIN IT
            const accountsInsertSql = `INSERT INTO accounts (${Object.keys(data).toString()}) VALUES (${Array(Object.keys(data).length).fill('$').map((e, i) => ('$' + (i + 1)))}) ON CONFLICT ON CONSTRAINT accounts_pkey DO NOTHING;` // for updating to a list use: UPDATE SET value=EXCLUDED.value||';'||accounts.value
            // console.log('SQL QUERY: '+ accountsInsertSql)
            await client.query(accountsInsertSql, Object.values(data))
              .catch(e => {
                console.error("Error", e.message, "occured when querying ", accountsInsertSql, Object.values(data))
              })
          }
          await csvReadStream.resume()
        })
          .on('end', async () => {
            await client.query("UPDATE accounts_scanned SET status='finished', time_finished=current_timestamp WHERE filename=$1 AND company_number=$2 AND accounts_date=$3;", [shortFileName, companyNumber, new Date(year, Number(month) - 1, day)])
            // await client.query("NOTIFY finished_accounts;")
  
            await client.release()
            resolve('processed')
          })
          .on('error', (e) => reject(e))
        
    })
    
}

// before this is started, a folder needs to be created at downlaods/financials/facts/2020-date/
(async () => {
    console.time("XBRL")
    // reporting statistics
  let unknownFileExtentions = 0, htmlFiles = 0, xmlFiles = 0, xmlErrors = 0, htmlErrors = 0,
    filesSkipped = 0, startTime = Date.now();
    // look in directory for files, and process them into csv, and then into the database
    const files = fs.readdirSync(folderName)
  console.log("Found", files.length, 'files. Started at', new Date().toLocaleString())
    // let limit=200, counter = 0
    for (const filesKey in files) {
        // if(limit===counter++) break
        const filename = path.resolve(folderName, files[filesKey]) //absolute paths only
        // console.log("Trying", filename)
        if (filename.match(/\.html$/i)) {
            await processHtmlFile(filename)
              .then((result) => {
                  if (result === 'processed') htmlFiles++
                  else if (result === 'skip') filesSkipped++
              })
              .catch(e => {
                console.log(e.message || e)
                htmlErrors++
              })
        } else if (filename.match(/\.xml$/i)) {
            await processHtmlFile(filename)
              .then((result) => {
                  if (result === 'processed') xmlFiles++
                  else if (result === 'skip') filesSkipped++
              })
              .catch(e => {
                  xmlErrors++
              })
        } else
          unknownFileExtentions++
  
      // write report to console
      let message = ''
      if (unknownFileExtentions !== 0) message += `\x1b[31m${unknownFileExtentions}\x1b[0m unknown file extensions, `
      if (htmlFiles !== 0) message += `\x1b[32m${htmlFiles}\x1b[0m htmlFiles, `
      if (htmlErrors !== 0) message += `\x1b[31m${htmlErrors}\x1b[0m htmlErrors, `
      if (xmlFiles !== 0) message += `\x1b[32m${xmlFiles}\x1b[0m xmlFiles, `
      if (xmlErrors !== 0) message += `\x1b[31m${xmlErrors}\x1b[0m xmlErrors, `
      if (filesSkipped !== 0) message += `\x1b[32m${filesSkipped}\x1b[0m filesSkipped, `
      message += `Average of \x1b[36m${Math.round((Date.now() - startTime) / 100 / (htmlFiles + xmlFiles)) / 10}s\x1b[0m/file, `
      message += `\x1b[36m${Math.round((htmlFiles + xmlFiles + filesSkipped + htmlErrors + xmlErrors) / files.length * 100000) / 1000}%\x1b[0m complete (batch), `
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write(message.substring(0, message.length - 2) + '    ')
    }
    console.log()
    console.timeEnd("XBRL")
    return htmlFiles + xmlFiles
})().then((n) => console.log("Processed", n, 'files'))

const csvHeaders = {
    'Label': 'label',
    'Name': 'name',
    'contextRef': 'context_ref',
    'Value': 'value',
    'EntityIdentifier': 'company_number',
    'Start': 'start_date',
    'End/Instant': 'end_date',
    'unitRef': 'unit',
    'Dec': 'decimals'
}
