const path = require('path');
const fs = require('fs');
const childProcess = require('child_process')

const loadAbstractDatabase = (absolutePathToDirectory: string) => {
    const files = fs.readdirSync(absolutePathToDirectory).map(file => path.resolve(absolutePathToDirectory, file))

    files.slice(0).forEach(file => {
        const arelleCommand = `
        "/Program Files/Arelle/arelleCmdLine" -f ${file}
          --plugins xbrlDB
          --store-to-XBRL-DB
          "35.233.118.80,5432,orange-pc,nXfNd9G6,abstract,,pgSemantic"
        `.replace(/\s+/mg, ' ')
        // console.log(arelleCommand)
        console.time(path.parse(file).name)
        const output = childProcess.execSync(arelleCommand)
        console.timeEnd(path.parse(file).name)
        // console.log(output.toString())
    })
}

const juneFolder = 'C:/Users/bme/projects/companies-house-database-manager/samples/financials/zipped/2020-08-31'
const decemberFolder = 'C:/Users/bme/projects/companies-house-database-manager/samples/financials/unzipped/2020-12-31'
const commandLineFolder = process.argv[2]
loadAbstractDatabase(commandLineFolder || decemberFolder)
