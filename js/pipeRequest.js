const request = require('request');
const {Pool} = require("pg");
const pool = new Pool({
  ssl: {
    rejectUnauthorized: false
  }
});
//Variables for status update:
let latestTimepoint = ''
let numberOfPackets = 0
let numberOfHeartbeats = 0
let numberOfEvents = 0
let numberOfNewCompanies = 0
let startTime = Date.now()
let streamPaused = false

const printUpdate = () => {
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(`Running for ${Math.round((Date.now() - startTime) / 1000)}s | Latest timepoint: ${latestTimepoint} | Packets: ${numberOfPackets} | Heartbeats: ${numberOfHeartbeats} | Events: ${numberOfEvents} | New companies: ${numberOfNewCompanies} | Stream ${streamPaused ? '\x1b[31mpaused\x1b[0m' : '\x1b[32mready\x1b[0m'}`)
}

const logEvent = (e) => {
  let eventType = e.event.type
  let timepoint = e.event.timepoint
  let companyNumber = e.data.company_number
  latestTimepoint = timepoint
  numberOfEvents++
  let dateOfCreation = e.data.date_of_creation
  if (new Date(dateOfCreation).valueOf() > Date.now() - 86400000) numberOfNewCompanies++
  // console.log(`\x1b[36m ${timepoint}\x1b[0m : ${eventType} ${companyNumber} DoC: ${e.data.date_of_creation}\x1b[0m`)
}

const uploadToDatabase = async (e) => {
  try {
    logEvent(e)
    // const nameResult = await pool.query('SELECT name FROM companies WHERE number=$1', [e.data.company_number])
    // if(nameResult.length > 0) {
    //   console.log("Name from database:", nameResult[0].name)
    //   console.log("Name from event:", e.data.company_name)
    // }else{
    //   console.log("Not found in database", e.data.company_number)
    // }
  } catch (e) {
    console.error("Database error: ", e)
  }
}


let dataBuffer = ''
const startingTimepoint = '22745533'
const reqStream = request.get('https://stream.companieshouse.gov.uk/companies?timepoint=' + startingTimepoint)
  .auth('q5YBtCQHw5a-T-I3HBkJsOfRG4szpz2y1VHa2gQ2', '')
  .on('response', (r) => {
    console.log("Headers received, status", r.statusCode)
    switch (r.statusCode) {
      case 200:
        setInterval(printUpdate, 500)
        break;
      case 416:
        console.log("Timepoint out of data")
        break;
      case 429:
        console.log("RATE LIMITED, exiting now")
        process.exit()
        break;
      default:
        process.exit()
    }
  })
  .on('error', (e) => console.error('error', e))
  .on('data', async d => {
    if (d.toString().length > 1) {
      // console.log("\x1b[31mPausing stream\x1b[0m")
      streamPaused = true
      reqStream.pause()
      
      numberOfPackets++
      // console.log('\x1b[35mAdded\x1b[0m', d.toString('utf8').length, 'chars to data buffer of', dataBuffer.length, 'chars')
      dataBuffer += d.toString('utf8')
      while (dataBuffer.includes('\n')) {
        let newLinePosition = dataBuffer.search('\n')
        let jsonText = dataBuffer.slice(0, newLinePosition)
        dataBuffer = dataBuffer.slice(newLinePosition + 1)
        try {
          let jsonObject = JSON.parse(jsonText)
          await uploadToDatabase(jsonObject)
        } catch (e) {
          console.error(`\x1b[31mCOULD NOT PARSE: \x1b[0m*${jsonText}*`)
        }
      }
      
      // console.log("\x1b[32mResuming stream\x1b[0m")
      streamPaused = false
      reqStream.resume()
    } else {
      numberOfHeartbeats++
    }
  })


