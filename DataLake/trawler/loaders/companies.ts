import {getPostgresClient} from '../dbUtils/getPostgresClient.js'
import {getMongoClient} from "../dbUtils/getMongoClient.js";

async function loadCompanies() {
    const pool = getPostgresClient()
    const mongo = await getMongoClient('importer')

    const companies = mongo.db('bulk').collection('companies').find().limit(50)

    console.log('Looping through companies')
    // loop through all companies, inserting them into postgres
    for await (const company of companies) {
        // await pool.query(`
        //     INSERT INTO companies
        //     (name, number, streetaddress, county, country, postcode,
        //      category, origin, status, date, can_file)
        //     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);
        // `,[company.CompanyName])
        console.log(company.CompanyNumber, Date.now())
    }

    await pool.end()
    await mongo.close()
}

await loadCompanies()