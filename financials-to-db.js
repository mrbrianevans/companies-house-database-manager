const fs = require('fs');
const {Client} = require("pg");
const client = new Client({
    ssl: {
        rejectUnauthorized: false,
        require: true
    }
});
const folderName = process.argv[2]

// upload accounts to database from html file
const processHtmlFile = async (filename) => {
    await client.connect()

    // logic goes here (database is available to query)
    const file = fs.readFileSync(folderName)

    await client.end()
}

// upload accounts to database from xml file
const processXmlFile = async (filename) => {
    await client.connect()

    // logic goes here (database is available to query)
    const file = fs.readFileSync(folderName)

    await client.end()
}

(async () => {
    // reporting statistics
    let unknownFileExtentions = 0, htmlFiles = 0, xmlFiles = 0, xmlErrors = 0, htmlErrors = 0;
    // look in directory for files, and process them with their corrosponding function
    const files = await fs.readdir(folderName)
    for (const filesKey in files) {
        const filename = files[filesKey]
        if (filename.match(/\.html$/i)) {
            await processHtmlFile(filename)
                .then(() => htmlFiles++)
                .catch(e => {
                    htmlErrors++
                })
        } else if (filename.match(/\.xml$/i)) {
            await processXmlFile(filename)
                .then(() => xmlFiles++)
                .catch(e => {
                    xmlErrors++
                })
        } else
            unknownFileExtentions++

        // write report to console
        let message = ''
        if (unknownFileExtentions !== 0) message += `\x1b[31m${unknownFileExtentions}\x1b[0m unknown file extensions, `
        if (htmlFiles !== 0) message += `\x1b[32m${htmlFiles}\x1b[0m htmlFiles, `
        if (htmlErrors !== 0) message += `\x1b[31m${htmlErrors}\x1b[0m htmlErrors, `
        if (xmlFiles !== 0) message += `\x1b[32m${xmlFiles}\x1b[0m xmlFiles, `
        if (xmlErrors !== 0) message += `\x1b[31m${xmlErrors}\x1b[0m xmlErrors, `
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(message.substring(0, message.length - 2))
    }
})()
