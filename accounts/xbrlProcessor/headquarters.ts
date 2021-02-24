import {createServer} from "http";
import {FinishedFileMetadata} from "./processFolder";

const osu = require('node-os-utils')
const cpu = osu.cpu
const fs = require('fs');
const os = require('os')

// express server to manage the operation
// scans a folder and serves out file names for cores to process
const folder = process.argv[2]
const port = Number(process.argv[3]) || 3000
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December']
const date = months[new Date(folder.slice(folder.length - 10)).getMonth()]
const files = fs.readdirSync(folder)
// console.log('08932482 at index', files.findIndex(f=>f.match(/08932482/)))
const finishedFiles: FinishedFileMetadata[] = []
const errors = []
const workers = new Set()
const startTime = new Date()
let index = 101680;
createServer(async (req, res) => {
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
        let lastMinuteCount = finishedFiles.findIndex((file: FinishedFileMetadata) => file.timestamp < Date.now() - 60000)
        lastMinuteCount = lastMinuteCount === -1 ? finishedFiles.length : lastMinuteCount
        // uses average speed based on previous 10 minutes (innacurate for the first 10 minutes)
        const totalMinutesLeft = (files.length - index) / finishedFiles.findIndex((file: FinishedFileMetadata) => file.timestamp < Date.now() - 600000) / 10
        const hoursLeft = Math.floor(totalMinutesLeft / 60)
        const minutesLeft = Math.floor(totalMinutesLeft - (hoursLeft * 60))
        const [, nextUpNumber] = files[index + 1].match(/Prod[0-9]{3}_[0-9]{4}_([A-Z0-9]{8})_([0-9]{4})([0-9]{2})([0-9]{2}).(xml|html)$/)
        const averageRecentProcessingTime = finishedFiles.slice(0, 5).reduce((previousValue, currentValue, index) => (previousValue * index + currentValue.time) / (index + 1), 0)
        const cpuUsage = await cpu.usage()
        res.end(`
<head>
  <meta http-equiv="refresh" content="5">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-BmbxuPwQa2lc/FVzBcNJ7UAyJxM6wuqIj61tLrc4wSX0szH/Ev+nYRRuWlolflfl" crossorigin="anonymous">
  <title>Accounts processing</title>
</head>
<div class="container mt-5 mb-5">
    <h1>Accounts processing:  <small class="text-muted">${date}</small></h1>
    <p>Started at ${startTime.toLocaleString()}, done ${finishedFiles.length} in ${Math.round((Date.now() - startTime.valueOf()) / 100 / 60 / 60) / 10} hours</p>
    <p>Currently  ${new Date().toLocaleString()}</p>
    <h3>${index} out of ${files.length}</h3>
    <div class="progress">
      <div class="progress-bar" role="progressbar" style="width: ${Math.round(index / files.length * 100)}%"></div>
    </div>
    <p>Approx. ${hoursLeft} hours and ${minutesLeft} minutes to go</p>
    <h2>Errors:</h2>
    <p>${errors.length} total</p>
    <ul>
    ${errors
            .slice(0, 5)
            .map(error => `<li>${error.message} at ${new Date(error.timestamp).toLocaleTimeString()}</li>`)
            .join('\n')
        }</ul>
    <h2>Recently finished:</h2>
    <p>Average ${Math.round(averageRecentProcessingTime)}ms per file</p>
    <ul>
    ${finishedFiles
            .slice(0, 5)
            .map(file => `<li>${file.file} in ${file.time}ms by worker ${Array.from(workers.values()).indexOf(file.core) + 1} at 
                        ${new Date(file.timestamp).toLocaleTimeString()}</li>`)
            .join('\n')
        }
    </ul>
    <p>Next up is ${nextUpNumber}</p>
    <div class="alert alert-success"><h3>${lastMinuteCount} in the last minute</h3></div>
    
    <p>Averaged ${Math.round(finishedFiles.length / (Date.now() - startTime.valueOf()) * 1000 * 60)} per minute</p>
    <div class="card text-dark bg-light mb-3">
    <div class="card-header"><h2>CPU</h2></div>
        <div class="card-body">
            <pre>
                ${os.cpus().length} logical processors
                ${os.cpus()[0].model}
            </pre>
            <p>Usage: ${cpuUsage}%</p>
        </div>
    
</div>

    <h2>Workers:</h2>
    <div class="col-5">
        <ul class="list-group">
    ${Array.from(workers.values())
            .map((pid, index) => (`
<li class="list-group-item${(finishedFiles.find(file => file.core === pid).timestamp > Date.now() - averageRecentProcessingTime * 1.5) ? ' active' : ''}">
    ${index + 1} - pid ${pid}
</li>`)).join('')}
    </ul>
    </div>

</div>
`)
    }
}).listen(port, () => {
    console.log("HQ dashboard on http://localhost:" + port)
})
