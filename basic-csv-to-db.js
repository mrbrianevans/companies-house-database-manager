
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

    const sqlQuery = "INSERT INTO companies (name, number, streetAddress, county, country, postCode, category, status, origin, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TO_TIMESTAMP($10, 'DD/MM/YYYY')) ON CONFLICT (number) DO NOTHING;"

    const companies = []
    console.time('Parse data')
    fs.createReadStream(filename)
      .pipe(csv({
          mapHeaders: ({header, index})=> headerMapper[header.trim()]||null
      }))
      .on('data', async(data) => {
          await client.query(sqlQuery, Object.values(data).slice(0,10), (err, res)=>{
              if(err) console.log(err)
              else companies.push(data)
          })
          console.timeLog('Parse data', `${companies.length} companies parsed`)
      })
      .on('end', () => {
        // console.log(companies);
        console.timeEnd('Parse data')
          console.log(`Uploaded ${companies.length} companies`)
//        client.end()
//	      console.log("Connection with database ended")
      });
    }catch (e) {
        console.log(e)
	    
    }finally
	{
		console.log("Finally")
    }
	setTimeout(()=>{
		client.end()
		console.log("Ended connected to db")
	}, 1000)
}

readJson('basic-sample.csv')

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
