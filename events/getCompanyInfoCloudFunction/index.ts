import {Pool} from "pg";
import {Request, Response} from "express";
import axios from "axios";

const getCompanyInfo = (req: Request, res: Response) => {
    res.set('Access-Control-Allow-Origin', 'https://companies.stream'); // change this for testing if needed
    if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
    } else {
        const pool = new Pool()
        const companyNumber = req.query?.company_number?.toString() || req.body?.company_number?.toString()
        if (!companyNumber) res.status(400).json({message: "Company number not specified"})
        else {
            const sqlStartTime = Date.now()
            pool.query(`
                SELECT *
                FROM companies
                WHERE number = $1
            `, [companyNumber])
                .then(({rows, rowCount}) => {
                    console.info(JSON.stringify({
                        companyNumber,
                        sqlExecutionTime: Date.now() - sqlStartTime,
                        rowsReturned: rows.length,
                        message: "SELECT company info WHERE number = " + companyNumber + " in " +
                            (Date.now() - sqlStartTime) + "ms",
                        severity: "INFO"
                    }))
                    if (rowCount === 1) {
                        res.status(200).json(rows[0])
                    } else if (rowCount === 0) {
                        //fetch company from API and insert it to database and then return it
                        const requestStartTime = Date.now()
                        axios.get('https://api.companieshouse.gov.uk/company/' + companyNumber,
                            {auth: {username: process.env.APIUSER, password: ''}}
                        )
                            .then(async r => { //status is always 200
                                const responseTime = Date.now() - requestStartTime
                                const secondsToReset = Math.round(Number(r.headers['x-ratelimit-reset'])
                                    - (Date.now() / 1000))
                                const remainingRequests = Number(r.headers['x-ratelimit-remain'])
                                // could sleep for 30 seconds if remaining is less than 10
                                console.log(JSON.stringify({
                                    severity: "INFO",
                                    message: "Company fetched from API in " + responseTime + "ms",
                                    companyNumber,
                                    responseTime,
                                    secondsToReset,
                                    remainingRequests
                                }))
                                const cp = {
                                    name: r.data.company_name,
                                    number: r.data.company_number,
                                    streetaddress: r.data.registered_office_address?.address_line_1,
                                    county: r.data.registered_office_address?.county,
                                    country: r.data.registered_office_address?.country,
                                    postcode: r.data.registered_office_address?.postal_code,
                                    category: r.data.type,
                                    status: r.data.company_status,
                                    date: r.data.date_of_creation,
                                    can_file: r.data.can_file
                                }
                                const {rows} = await pool.query(`
                                            INSERT INTO companies (name, number, streetaddress, county,
                                                                   country, postcode, category, status,
                                                                   date, can_file)
                                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                            RETURNING *`,
                                    [cp.name, cp.number, cp.streetaddress, cp.county, cp.country,
                                        cp.postcode, cp.category, cp.status, cp.date, cp.can_file])
                                res.status(200).json(rows[0])
                            }).catch(e => {
                            switch (e.response.status) {
                                case 400:
                                    // mistake in request (probably not authenticated)
                                    console.error(JSON.stringify({
                                        severity: "ERROR",
                                        message: e.message,
                                        response: e.response.data
                                    }))
                                    break;
                                case 401:
                                    // not authenticated
                                    console.error(JSON.stringify({
                                        severity: "ERROR",
                                        message: e.message,
                                        response: e.response.data
                                    }))
                                    break;
                                case 404:
                                    // company not found
                                    console.error(JSON.stringify({
                                        severity: "WARNING",
                                        message: "Company not found on API",
                                        companyNumber
                                    }))
                                    break;
                                case 429:
                                    // rate limit exceeded, console log it, and sleep for 30 seconds
                                    console.error(JSON.stringify({
                                        severity: "ERROR",
                                        message: "Rate limit exceeded!",
                                        response: e.response.data
                                    }))
                                    break;
                                default:
                                    console.error(JSON.stringify({
                                        severity: "ERROR",
                                        message: "UNKNOWN CODE: " + e.message,
                                        response: e.response.data
                                    }))
                                    break;
                            }
                            res.status(404).json({message: "Company not found"})
                        })

                    } else {
                        console.error(JSON.stringify({
                            message: rowCount + " companies found",
                            severity: "WARNING"
                        }))
                        res.status(404).json({message: rowCount + " companies found"})
                    }
                }).catch(e => {
                console.error(JSON.stringify({
                    severity: 'ERROR',
                    errorMessage: e.message,
                    errorCode: e.code,
                    message: 'Could not select company info from database'
                }))
                res.status(404).json({message: "Company not found"})
            })
        }
    }
}


export {getCompanyInfo}
