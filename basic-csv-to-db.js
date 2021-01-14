
const readJson = async(filename) => {
    const csv = require('csv-parser')
    const fs = require('fs')
//	console.log("CA CERT: ")
//console.log(process.env.CA_CERT)
    const {Client} = require("pg") ;
    const client = new Client({
//	database: process.env.PGDATABASE,
//	user: process.env.PGUSER,
	    ssl: {
		    rejectUnauthorized: false,
//		    ca:process.env.CA_CERT
			require: true
	    }
    });
    try{
    await client.connect()
    client.on("error", console.log);

    const companyQuery = "INSERT INTO companies (name, number, streetAddress, county, country, postCode, category, status, origin, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TO_TIMESTAMP($10, 'DD/MM/YYYY')) ON CONFLICT (number) DO NOTHING;"
    let sic_errors = 0
    const sicQuery = "INSERT INTO sic (company_number, sic_code) VALUES ($1, $2) ON CONFLICT (company_number, sic_code) DO NOTHING;"
    let companies = 0
	    let company_errors = 0
    console.time('Parse data')
const startTime = Date.now()
const progressUpdater =  setInterval(()=>{
    // report on progress
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    let timeTaken = Date.now() - startTime
    let message = `${Math.floor(timeTaken / 1000)}s Progress: \x1b[32m${companies} OK\x1b[0m companies, \x1b[31m${sic_errors} ERR\x1b[0m sics, \x1b[31m${company_errors} ERR\x1b[0m companies, AVERAGE SPEED: \x1b[36m${Math.round(timeTaken / companies * 1000) / 1000}ms\x1b[0m per company`
    process.stdout.write(message)
}, 1000)
const fileReadStream = fs.createReadStream(filename)
      .pipe(csv({
          mapHeaders: ({header, index})=> headerMapper[header.trim()]||null
      }))
      .on('data', async(data) => {
          fileReadStream.pause() // pause reading while database upload takes place
          await client.query(companyQuery, Object.values(data).slice(0,10))
              .then(async(res)=>{

                      const sicOne = data.SicCode1.match(/^[0-9]{5}/)
                      if(sicOne)
                        await client.query(sicQuery, [data.number, sicOne[0]]).catch(err=>{if(err) sic_errors++})

                      const sicTwo = data.SicCode2.match(/^[0-9]{5}/)
                      if(sicTwo)
                        await client.query(sicQuery, [data.number, sicTwo[0]]).catch(err=>{if(err) sic_errors++})

                      const sicThree = data.SicCode3.match(/^[0-9]{5}/)
                      if(sicThree)
                        await client.query(sicQuery, [data.number, sicThree[0]]).catch(err=>{if(err) sic_errors++})

                  const sicFour = data.SicCode4.match(/^[0-9]{5}/)
                  if (sicFour)
                      await client.query(sicQuery, [data.number, sicFour[0]]).catch(err => {
                          if (err) sic_errors++
                      })

                  companies++

//     	    console.timeLog('Parse data', `${companies} companies parsed`)
              }).catch(err => company_errors++)
          fileReadStream.resume()
      })
    .on('end', async () => {
        // console.log(companies);
        clearInterval(progressUpdater)
        console.timeEnd('Parse data')
        console.log(`${sic_errors} errors with inserting SIC codes`)
        console.log(`Uploaded ${companies} companies`)
        await client.end()
        console.log("Connection with database ended")
    });
    }catch (e) {
        console.log(e)

    }
	// setTimeout(()=>{
	// 	client.end()
	// 	console.log("Ended connected to db")
	// 	console.timeEnd("Parse data")
	// }, 60*60*1000)//disconnect after 1 hour
}
(async () => {
	const path = require('path')
	await readJson(path.resolve(__dirname, process.argv[2]))
})()

const headerMapper = {
    CompanyName: 'name',
    CompanyNumber: 'number',
    'RegAddress.CareOf': null,
    'RegAddress.POBox': null,
    'RegAddress.AddressLine1': 'streetAddress',
    'RegAddress.AddressLine2': '',
    'RegAddress.PostTown': '',
    'RegAddress.County': 'county',
    'RegAddress.Country': 'country',
    'RegAddress.PostCode': 'postCode',
    CompanyCategory: 'category',
    CompanyStatus: 'status',
    CountryOfOrigin: 'origin',
    DissolutionDate: null,
    IncorporationDate: 'date',
    'Accounts.AccountRefDay': null,
    'Accounts.AccountRefMonth': null,
    'Accounts.NextDueDate': null,
    'Accounts.LastMadeUpDate': null,
    'Accounts.AccountCategory': null,
    'Returns.NextDueDate': null,
    'Returns.LastMadeUpDate': null,
    'Mortgages.NumMortCharges': null,
    'Mortgages.NumMortOutstanding': null,
    'Mortgages.NumMortPartSatisfied': null,
    'Mortgages.NumMortSatisfied': null,
    'SICCode.SicText_1': 'SicCode1',
    'SICCode.SicText_2': 'SicCode2',
    'SICCode.SicText_3': 'SicCode3',
    'SICCode.SicText_4': 'SicCode4',
    'LimitedPartnerships.NumGenPartners': null,
    'LimitedPartnerships.NumLimPartners': null,
    URI: null,
    'PreviousName_1.CONDATE': null,
    'PreviousName_1.CompanyName': null,
    'PreviousName_2.CONDATE': null,
    'PreviousName_2.CompanyName': null,
    'PreviousName_3.CONDATE': null,
    'PreviousName_3.CompanyName': null,
    'PreviousName_4.CONDATE': null,
    'PreviousName_4.CompanyName': null,
    'PreviousName_5.CONDATE': null,
    'PreviousName_5.CompanyName': null,
    'PreviousName_6.CONDATE': null,
    'PreviousName_6.CompanyName': null,
    'PreviousName_7.CONDATE': null,
    'PreviousName_7.CompanyName': null,
    'PreviousName_8.CONDATE': null,
    'PreviousName_8.CompanyName': null,
    'PreviousName_9.CONDATE': null,
    'PreviousName_9.CompanyName': null,
    'PreviousName_10.CONDATE': null,
    'PreviousName_10.CompanyName': null,
    ConfStmtNextDueDate: null,
    ConfStmtLastMadeUpDate: null

    }
