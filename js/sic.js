
const readCSV = async(filename) => {
    const csv = require('csv-parser')
    const fs = require('fs')
    const {Client} = require("pg") ;
    const client = new Client({
	    ssl: {
		    rejectUnauthorized: false,
			require: true
	    }
    });
    try{
    await client.connect()
    client.on("error", console.log);

    const sqlQuery = "INSERT INTO sic_map (code, description) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING ;"

    let sic_codes = 0
    console.time('Parse data')
    fs.createReadStream(filename)
      .pipe(csv({
          mapHeaders: ({header, index})=> headerMapper[header.trim()]||null
      }))
      .on('data', async(data) => {
          await client.query(sqlQuery, Object.values(data), (err, res)=>{
              if(err) console.log(err)
              else sic_codes++

      //    console.timeLog('Parse data', `${sic_codes} sic_codes parsed`)
	        })
      })
      .on('end', () => {
        // console.log(sic_codes);
        //console.timeEnd('Parse data')
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
      console.log(`Uploaded ${sic_codes} companies`)
		console.log("Ended connected to db")
		console.timeEnd("Parse data")
	}, 60*1000)//disconnect after 1 minute
}
const path = require('path')
readCSV(path.resolve(__dirname, process.argv[2]))

const headerMapper = {
    'SIC Code': 'code',
    'Description': 'description'
}
