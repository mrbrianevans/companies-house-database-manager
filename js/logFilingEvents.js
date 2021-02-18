const request = require("request")
const {Pool} = require("pg")
const fs = require('fs')
const path = require('path')
let qtyOfNotifications = 0
let averageProcessingTime = 0
let startTime = Date.now()
let reportStatsInterval
let resetStatsInterval
let last60NotificationTimes = []
let last60ProcessingTimes = []
let last60Backlog = []
let eventsSaved = 0
let databaseErrors = 0
fs.writeFileSync(path.resolve(__dirname, 'filingEventErrors.txt'), '')
fs.writeFileSync(path.resolve(__dirname, 'filingEventLogs.txt'), 'Started at ' + new Date().toLocaleString())
const StreamFilings = async () => {
    {
        let pool = new Pool({
    host: process.env.PG_HOST,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    port: Number(process.env.PG_PORT)
  })
        let dataBuffer = ''
        let {rows: latestTimepointRow} = await pool.query('SELECT timepoint FROM filing_events ORDER BY timepoint DESC LIMIT 1;')
        console.log("Starting from timepoint", latestTimepointRow[0].timepoint)
        const reqStream = request.get('https://stream.companieshouse.gov.uk/filings?timepoint=' + latestTimepointRow[0].timepoint)
          .auth(process.env.APIUSER, '')
          .on('response', (r) => {
              startTime = Date.now()
              console.log("filing Headers received, status", r.statusCode)
              switch (r.statusCode) {
                  case 200:
                      console.time("Listening on filing stream")
                      reportStatsInterval = setInterval(() => {
                          // console.log(`Filing - Average processing time: ${Math.round(averageProcessingTime)}ms, new notification every ${Math.round((Date.now() - startTime) / qtyOfNotifications)}ms`)
                          const last60TotalTime = last60NotificationTimes[0] - last60NotificationTimes[last60NotificationTimes.length - 1]
                          const last60ProcessingTime = last60ProcessingTimes.slice(0, 5).reduce((previousValue, currentValue) => previousValue + currentValue, 0)
                          const recentProcessingTimePerNotification = last60ProcessingTime / last60ProcessingTimes.slice(0, 5).length
                          const averageTimePerNewNotification = (last60TotalTime / (last60NotificationTimes.length + 1))
                          const averageBacklog = last60Backlog.reduce((previousValue, currentValue) => previousValue + currentValue, 0) / last60Backlog.length / 1000
                          // console.log("Last 60 average proc time", Math.round(last60ProcessingTimes.reduce((previousValue, currentValue) => previousValue+currentValue)/last60ProcessingTimes.length) / 1000, 'seconds')
                          // console.log("Last 60 average notification time", Math.round(averageTimePerNewNotification) / 1000, 'seconds')
                          let monitorMessage = `Alive: \x1b[36m${Math.round((Date.now() - startTime) / 1000)}s\x1b[0m | Backlog: ${Math.round(averageBacklog)}s | proc/note ${Math.round(recentProcessingTimePerNotification / averageTimePerNewNotification * 100)}% | Processing time: ${Math.round(recentProcessingTimePerNotification)}ms | New notification every: ${Math.round(averageTimePerNewNotification)}ms | Events Saved: \x1b[32m${eventsSaved}\x1b[0m | Database errors: \x1b[31m${databaseErrors}\x1b[0m`
                          let noColorMessage = `Alive: ${Math.round((Date.now() - startTime) / 1000)}s \n Backlog: ${Math.round(averageBacklog)}s \n proc/note ${Math.round(recentProcessingTimePerNotification / averageTimePerNewNotification * 100)}% \n Processing time: ${Math.round(recentProcessingTimePerNotification)}ms \n New notification every: ${Math.round(averageTimePerNewNotification)}ms \n Events Saved: ${eventsSaved} \n Database errors: ${databaseErrors}\n`
                          // process.stdout.clearLine(null)
                          // process.stdout.cursorTo(0)
                          // process.stdout.write(monitorMessage)
                          fs.writeFileSync(path.resolve(__dirname, 'filingEventLogs.txt'), 'Started at ' + new Date(startTime).toLocaleString() + '\n' + new Date().toLocaleString() + " : " + noColorMessage)
                          // console.log("Average backlog on filing: ", Math.round(averageBacklog), 'seconds')
                      }, 10000)
                      console.log("Listening to updates on filing stream")
                      break;
                  case 416:
                      console.log("Timepoint out of date")
                      break;
                  case 429:
                      console.log("RATE LIMITED, exiting now")
                      process.exit()
                      break;
                  default:
                      process.exit()
              }
          })
          .on('error', (e) => console.error('Ferror', e))
          .on('data', async (d) => {
              if (d.toString().length > 1) {
                  reqStream.pause()
                  
                  dataBuffer += d.toString('utf8')
                  dataBuffer = dataBuffer.replace('}}{', '}}\n{')
                  while (dataBuffer.includes('\n')) {
                      let singleStartTime = Date.now()
                      last60NotificationTimes.unshift(Date.now())
                      if (qtyOfNotifications > 100)
                          last60NotificationTimes.pop()
                      // console.time('Process filing history')
                      let newLinePosition = dataBuffer.search('\n')
                      let jsonText = dataBuffer.slice(0, newLinePosition)
                      dataBuffer = dataBuffer.slice(newLinePosition + 1)
                      if (jsonText.length === 0) continue;
                      const client = await pool.connect()
                      try {
                          let jsonObject = JSON.parse(jsonText)
                          const companyNumber = jsonObject.resource_uri.match(/^\/company\/([A-Z0-9]{6,8})\/filing-history/)[1]
                          // query enumeration map in database to figure out what the company has filed
                          // slow down the stream and send more meaningful information in teh notification
                          let {
                            rows: companyProfile,
                            rowCount: companysFound
                          } = await client.query("SELECT * FROM companies WHERE number=$1", [companyNumber])
                          
                          const {
                              rows: descriptions,
                              rowCount
                          } = await client.query("SELECT value FROM filing_history_descriptions WHERE key=$1 LIMIT 1", [jsonObject.data.description])
                          // console.timeLog('Process filing history',{"Database response": descriptions})
                          if (rowCount === 1) {
                              const description = descriptions[0]['value']
                              let formattedDescription = description.replace(/{([a-z_]+)}/g, (s) => jsonObject.data.description_values ? jsonObject.data.description_values[s.slice(1, s.length - 1)] || '' : '')
                              formattedDescription = formattedDescription.replace(/^\*\*/, '<b>')
                              formattedDescription = formattedDescription.replace(/\*\*/, '</b>')
                              // console.log(formattedDescription)
                              // if(companysFound === 1)
                              const eventToEmit = {
                                  source: 'filing-history',
                                  title: formattedDescription.match(/<b>(.+)<\/b>/) ? formattedDescription.match(/<b>(.+)<\/b>/)[1] : jsonObject.data.category,
                                  description: formattedDescription,
                                  published: new Date(jsonObject.event.published_at),
                                  companyNumber: companyNumber,
                                  resource_kind: 'filing-history',
                                  companyProfile: companysFound === 1 ? companyProfile[0] : undefined
                              }
                              last60Backlog.unshift(Date.now() - eventToEmit.published.valueOf())
                              if (qtyOfNotifications > 5) {
                                  last60Backlog.pop()
                              }
                              // SAVE EVENT TO DATABASE
                              // it seems to be getting each event twice, which causes a problem for the primary key when it tries to insert the same row again. thats why there is on conflict do nothing. this is a short term fix
                              let insertParameters = [jsonObject.resource_id, jsonObject.data.category, jsonObject.data.description, formattedDescription, jsonObject.data.date, jsonObject.event.timepoint, jsonObject.event.published_at, jsonObject.data.barcode, jsonObject.data.type, companyNumber] // fill in actual values
                              await client.query("INSERT INTO filing_events (id, category, description_code, description, filing_date, timepoint, published, barcode, type, company_number) VALUES ($1,$2,$3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING;", insertParameters)
                                .then(r => eventsSaved++)
                                .catch(e => {
                                    fs.appendFileSync(path.resolve(__dirname, 'filingEventErrors.txt'), '\n\n' + e.toString() + `\n Company number: ${companyNumber}, ResourceId: ${jsonObject.resource_id}, Barcode: ${jsonObject.data.barcode}, Published: ${jsonObject.event.published_at}`)
                                    databaseErrors++
                                })
                          } else {
                              if (jsonObject.data.description && jsonObject.data.description !== 'legacy') // some are undefined and legacy
                                  console.log("\x1b[31mDatabase could not find description\x1b[0m for", jsonObject.data.description)
                          }
                          
                      } catch (e) {
                          // error handling
                          if (e instanceof SyntaxError)
                              console.error(`\x1b[31mCOULD NOT PARSE filing: \x1b[0m*${jsonText}*`)
                          else
                              console.error('\x1b[31m', e, '\x1b[0m')
                      } finally {
                          await client.release() // release the client when finished, regardless of errors
                          // console.timeEnd('Process filing history')
                      }
                      
                      let totalTimeSoFar = qtyOfNotifications++ * averageProcessingTime + (Date.now() - singleStartTime)
                      averageProcessingTime = totalTimeSoFar / qtyOfNotifications
                      last60ProcessingTimes.unshift(Date.now() - singleStartTime)
                      if (qtyOfNotifications > 50)
                          last60ProcessingTimes.pop()
                  }
                  reqStream.resume()
              }
          })
          .on('end', async () => {
              try {
                  clearInterval(reportStatsInterval)
                  clearInterval(resetStatsInterval)
              } catch (e) {
              
              }
              
              console.timeEnd("Listening on filing stream")
              await pool.end()
              console.error("Filing stream ended")
          })
    }
}

StreamFilings()

//test types with a real record:
const sampleFilingEvents = [{
    "resource_kind": "filing-history",
    "resource_uri": "/company/10676322/filing-history/MzI4OTQzODc5MGFkaXF6a2N4",
    "resource_id": "MzI4OTQzODc5MGFkaXF6a2N4",
    "data": {
        "barcode": "X9WQX0NE",
        "category": "accounts",
        "date": "2021-01-22",
        "description": "accounts-with-accounts-type-micro-entity",
        "description_values": {
            "made_up_date": "2020-03-31"
        },
        "links": {
            "self": "/company/10676322/filing-history/MzI4OTQzODc5MGFkaXF6a2N4"
        },
        "transaction_id": "MzI4OTQzODc5MGFkaXF6a2N4",
        "type": "AA"
    },
    "event": {
        "timepoint": 48990574,
        "published_at": "2021-01-22T18:28:02",
        "type": "changed"
    }
},
    {
        "resource_kind": "filing-history",
        "resource_uri": "/company/07260025/filing-history/MzI2NTIzNzU0N2FkaXF6a2N4",
        "resource_id": "MzI2NTIzNzU0N2FkaXF6a2N4",
        "data": {
            "annotations": [{
                "annotation": "Clarification A SECOND FILED CS01 STATEMENT OF CAPITAL \u0026 SHAREHOLDER INFORMATION WAS REGISTERED ON 25/01/21",
                "category": "annotation",
                "date": "2021-01-25",
                "description": "annotation",
                "description_values": {"description": "Clarification a second filed CS01 statement of capital \u0026 shareholder information was registered on 25/01/21"},
                "type": "ANNOTATION"
            }],
            "barcode": "X95HGATK",
            "category": "confirmation-statement",
            "date": "2020-05-20",
            "description": "confirmation-statement",
            "description_values": {"original_description": "20/05/20 Statement of Capital gbp 126"},
            "links": {
                "document_metadata": "https://frontend-doc-api.companieshouse.gov.uk/document/TsRu1rGfoPfqgDJB2RvUReq1XPkdrjvr302RHkUW_ww",
                "self": "/company/07260025/filing-history/MzI2NTIzNzU0N2FkaXF6a2N4"
            },
            "pages": 5,
            "paper_filed": true,
            "transaction_id": "MzI2NTIzNzU0N2FkaXF6a2N4",
            "type": "CS01"
        },
        "event": {"timepoint": 49098961, "published_at": "2021-01-25T13:32:01", "type": "changed"}
    },
    {
        "resource_kind": "filing-history",
        "resource_uri": "/company/12114535/filing-history/MzI4MDM0NDI4NGFkaXF6a2N4",
        "resource_id": "MzI4MDM0NDI4NGFkaXF6a2N4",
        "data": {
            "annotations": [{
                "annotation": "Clarification A SECOND FILED CS01 STATEMENT OF CAPITAL \u0026 SHAREHOLDER INFORMATION WAS REGISTERED ON 25/01/21",
                "category": "annotation",
                "date": "2021-01-25",
                "description": "annotation",
                "description_values": {"description": "Clarification a second filed CS01 statement of capital \u0026 shareholder information was registered on 25/01/21"},
                "type": "ANNOTATION"
            }],
            "barcode": "X9FIEB6B",
            "category": "confirmation-statement",
            "date": "2020-10-12",
            "description": "confirmation-statement",
            "description_values": {"original_description": "21/07/20 Statement of Capital eur 38000001"},
            "links": {
                "document_metadata": "https://frontend-doc-api.companieshouse.gov.uk/document/2IPexI9Xo_VfyzWXITSO4cQ7LvDWwN4U24rNeUlCBHE",
                "self": "/company/12114535/filing-history/MzI4MDM0NDI4NGFkaXF6a2N4"
            },
            "pages": 4,
            "paper_filed": true,
            "transaction_id": "MzI4MDM0NDI4NGFkaXF6a2N4",
            "type": "CS01"
        },
        "event": {"timepoint": 49096881, "published_at": "2021-01-25T13:16:02", "type": "changed"}
    },
    {
        "resource_kind": "filing-history",
        "resource_uri": "/company/12317301/filing-history/MzI4MzUzMjgyMGFkaXF6a2N4",
        "resource_id": "MzI4MzUzMjgyMGFkaXF6a2N4",
        "data": {
            "annotations": [{
                "annotation": "Clarification A second filed CS01  (Statement of capital change and Shareholder information change) was registered on 25/01/2021.",
                "category": "annotation",
                "date": "2021-01-25",
                "description": "annotation",
                "description_values": {"description": "Clarification a second filed CS01 (Statement of capital change and Shareholder information change) was registered on 25/01/2021."},
                "type": "ANNOTATION"
            }],
            "barcode": "X9HYDHPL",
            "category": "confirmation-statement",
            "date": "2020-11-16",
            "description": "confirmation-statement",
            "description_values": {"original_description": "14/11/20 Statement of Capital gbp 300.00"},
            "links": {
                "document_metadata": "https://frontend-doc-api.companieshouse.gov.uk/document/Hl5VNNqB7HnAUZN1K9ugcwewb9ydUjF9nRJLaZlY1mA",
                "self": "/company/12317301/filing-history/MzI4MzUzMjgyMGFkaXF6a2N4"
            },
            "pages": 5,
            "paper_filed": true,
            "transaction_id": "MzI4MzUzMjgyMGFkaXF6a2N4",
            "type": "CS01"
        },
        "event": {"timepoint": 49095333, "published_at": "2021-01-25T13:04:04", "type": "changed"}
    },
    {
        "resource_kind": "filing-history",
        "resource_uri": "/company/12317301/filing-history/MzI4MzUzMjgyMGFkaXF6a2N4",
        "resource_id": "MzI4MzUzMjgyMGFkaXF6a2N4",
        "data": {
            "barcode": "X9HYDHPL",
            "category": "confirmation-statement",
            "date": "2020-11-16",
            "description": "confirmation-statement",
            "description_values": {"original_description": "14/11/20 Statement of Capital gbp 300.00"},
            "links": {
                "document_metadata": "https://frontend-doc-api.companieshouse.gov.uk/document/Hl5VNNqB7HnAUZN1K9ugcwewb9ydUjF9nRJLaZlY1mA",
                "self": "/company/12317301/filing-history/MzI4MzUzMjgyMGFkaXF6a2N4"
            },
            "pages": 5,
            "transaction_id": "MzI4MzUzMjgyMGFkaXF6a2N4",
            "type": "CS01"
        },
        "event": {"timepoint": 49094846, "published_at": "2021-01-25T13:01:04", "type": "changed"}
    }
]
