// const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
// const jsonpipe = require('jsonpipe');
// // this library does exactly what i want, but it requires xmlhttprequests which aren't in node
// jsonpipe.flow('https://stream.companieshouse.gov.uk/companies?timepoint=22733689', {
//     "headers": {
//         'Authorization':' Basic cTVZQnRDUUh3NWEtVC1JM0hCa0pzT2ZSRzRzenB6MnkxVkhhMmdRMjo='
//     },
//     "delimiter": '\n',
//     "onHeaders": (statusText, headers) => {
//         console.log("Headers received with status text:", statusText)
//     },
//     "error": errorMsg => console.error("ERROR OCCURED: ", errorMsg),
//     "success": data => console.log("Received JSON chunk...", data),
//     "method": "GET",
//     "data": "",
//     "timeout": 10000,
//     "disableContentType": true
// })


console.log(process.env.PGHOST)
