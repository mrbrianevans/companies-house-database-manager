import {getPostgresClient} from '../dbUtils/getPostgresClient.js'
import {getMongoClient} from "../dbUtils/getMongoClient.js";

async function loadCompanies() {
    const pool = getPostgresClient()
    const mongo = await getMongoClient('importer')

    const companies = mongo.db('bulk').collection('companies').find().limit(50)

    console.log('Looping through companies')
    // loop through all companies, inserting them into postgres
    for await (const company of companies) {
        await pool.query(`
            INSERT INTO companies1
            (last_updated, company_name, company_number, postcode, address_line_1, incorporation_date)
            VALUES (default, $1, $2, $3, $4, $5);
        `, [company.CompanyName, company.CompanyNumber])
        console.log(company.CompanyNumber, Date.now())
    }

    await pool.end()
    await mongo.close()
}

await loadCompanies()