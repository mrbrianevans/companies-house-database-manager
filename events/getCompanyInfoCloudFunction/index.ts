import {Pool} from "pg";
import {Request, Response} from "express";

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
            `, [companyNumber]).then(({rows, rowCount}) => {
                console.info(JSON.stringify({
                    companyNumber,
                    sqlExecutionTime: Date.now() - sqlStartTime,
                    rowsReturned: rows.length,
                    message: "SELECT company info WHERE number = " + companyNumber + " in " + (Date.now() - sqlStartTime) + "ms",
                    severity: "INFO"
                }))
                if (rowCount === 1) {
                    res.status(200).json(rows[0])
                } else {
                    console.error(JSON.stringify({message: rowCount + " companies found"}))
                    res.status(404).json({message: rowCount + " companies found"})
                }
            }).catch(e => {
                console.error(JSON.stringify({
                    severity: 'ERROR',
                    errorMessage: e.message,
                    errorCode: e.code,
                    message: 'Could not select company info from database'
                }))
            })
        }
    }
}


export {getCompanyInfo}
