/*
This is a new attempt at loading iXBRL files with less errors. The previous method of loading them to google cloud
caused errors when internet cut out. This is offline only and files can be separately uploaded using gsutil.

Plan:
- loop through all xbrl files
- check if they are already scanned to csv in the CSV folder
- check if they are in the postgres accounts table
- if neither of those, then add it to the to-do list for python Arelle
- check if it exists in the filing-events table, and if not, add it to a separate to-do list?

Saves status of each accounts file in the accounts_tracker table. Keeps track of if the facts are in DB, and filing event
 */
import {readdir} from 'fs/promises'
import {basename, resolve} from 'path'
import {fork} from 'child_process'

const directoryOfDirectories = 'N:\\CompaniesHouse\\Accounts\\MonthlyBulk'

async function load() {
  console.log('Started at', new Date())
  const directories = await readdir(directoryOfDirectories, {withFileTypes: true}).then(list => list.filter(item => item.isDirectory()).map(d => resolve(directoryOfDirectories, d.name)))

  for (const directory of directories) {
    fork('newLoaderChildProcess.js', [directory])
      .on('close', (exitCode) => {
        console.log('Directory', basename(directory), 'exited with code', exitCode)
      })
  }
  console.log('Finished at', new Date())
}

load()
