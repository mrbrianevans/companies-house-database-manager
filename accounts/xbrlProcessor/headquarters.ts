import {createServer} from "http";
import {FinishedFileMetadata} from "./processFolder";

const fs = require('fs');
const os = require('os')

// express server to manage the operation
// scans a folder and serves out file names for cores to process
const folder = process.argv[2]
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December']
const date = months[new Date(folder.slice(folder.length - 10)).getMonth()]
const files = fs.readdirSync(folder)
const finishedFiles: FinishedFileMetadata[] = []
const errors = []
const workers = new Set()
let index = 0;
createServer((req, res) => {
    if (req.url.endsWith('next')) {
        //return next filename
        res.end(folder + '/' + files[index++])
    } else if (req.url.endsWith('error')) {
        //push a new error
        let error = ""
        req.on('data', d => error += d)
        req.on('end', () => {
            errors.push(JSON.parse(error))
            res.end()
        })
    } else if (req.url.endsWith('finished')) {
        //push a new file
        let file = ""
        req.on('data', d => file += d)
        req.on('end', () => {
            const fileObj: FinishedFileMetadata = JSON.parse(file)
            if (!workers.has(fileObj.core)) workers.add(fileObj.core)
            finishedFiles.unshift(fileObj)
            res.end()
        })
    } else {
        //return status update to view in browser
        const lastMinuteCount = finishedFiles.findIndex((file: FinishedFileMetadata) => file.timestamp < Date.now() - 60000)
        res.end(`
<head>
  <meta http-equiv="refresh" content="1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-BmbxuPwQa2lc/FVzBcNJ7UAyJxM6wuqIj61tLrc4wSX0szH/Ev+nYRRuWlolflfl" crossorigin="anonymous">
</head>
<div class="container">
    <h1>Accounts processing: ${date}</h1>
    <h3>${index} out of ${files.length}</h3>
    <h2>Errors:</h2>
    <ul>
    ${errors
            .slice(0, 5)
            .map(error => `<li>${error}</li>`)
            .join('\n')
        }</ul>
    <h2>Recently finished:</h2>
    <ul>
    ${finishedFiles
            .slice(0, 5)
            .map(file => `<li>${file.file} in ${file.time}ms by worker ${Array.from(workers.values()).indexOf(file.core) + 1} at 
                        ${new Date(file.timestamp).toLocaleTimeString()}</li>`)
            .join('\n')
        }
    </ul>
    <h3>${lastMinuteCount === -1 ? finishedFiles.length : lastMinuteCount}
                    in the last minute</h3>
    <h2>CPU</h2>
    <pre>
        ${os.cpus().length} cores
        ${os.cpus()[0].model}
    </pre>
    <h2>Workers:</h2>
    <ul>
    ${Array.from(workers.values()).map((pid, index) => (`<li>${index + 1} - pid ${pid}</li>`)).join('')}
    </ul>
</div>
`)
    }
}).listen(3000, () => {
    console.log("HQ dashboard on http://localhost:3000")
})