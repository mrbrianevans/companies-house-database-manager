const https = require('https')
const fs = require('node:fs')
const options = {
    port: 443,
    method: 'GET',
    hostname: 'document-api.companieshouse.gov.uk',
    path: '/document/Avvp-3T0i3cBM3Eq4LrKc-T0mYpAnnO9nzhuuXFp8gA/content',
    auth: process.env.APIUSER + ':',
    headers: {Accept: 'application/xhtml+xml'}
}
https.request(options, res => {
    const {location} = res.headers
    console.log('Redirected to', location, 'with status code', res.statusCode)
    https.request(new URL(location), res1 => {
        console.log(res1.headers)
        const ws = fs.createWriteStream('./accounts.xhtml')
        // prints out XML document to console
        // res1.on('data', data=>console.log('Packet:', data.toString()))
        res1
            .pipe(ws)
            .on('end', () => console.log('\n\n', 'Finished', res1.headers['content-type'], 'download'))
    }).end()
}).end()
