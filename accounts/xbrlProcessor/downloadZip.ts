const fs = require('fs')
const zlib = require('zlib')
const http = require('http')
const path = require('path')

//todo: I'm getting an error trying to unzip it: incorrect header check

// downloads and unzips a file from companies house, returning the unzipped folder name
export const downloadAndUnzip = (zipFileName) => {
  const url = 'http://download.companieshouse.gov.uk/' + zipFileName
  const filenameMatching = zipFileName.match(/Accounts_Bulk_Data-([0-9\-]*).zip/)
  if (!filenameMatching) return new Promise((r, reject) => reject('Filename invalid'))
  const [, monthYear] = filenameMatching
  const saveTo = path.resolve(__dirname, 'unzipped', monthYear)
  const saveZipToFolder = path.resolve(__dirname, 'zipped')
  const saveZipToFile = path.resolve(saveZipToFolder, monthYear + '.zip')
  if (!fs.existsSync(saveTo)) fs.mkdirSync(saveTo, {recursive: true})
  if (!fs.existsSync(saveZipToFolder)) fs.mkdirSync(saveZipToFolder, {recursive: true})

  http.get(url, response => {
    response.pipe(fs.createWriteStream(saveZipToFile))
        .on('finish', () => {
          const zipReadstream = fs.createReadStream(saveZipToFile)
          const xbrlWritestream = fs.createWriteStream(saveTo + '/file')
          const unzip = zlib.createUnzip()
          return new Promise(resolve => {
            zipReadstream
                .pipe(unzip)
                .pipe(xbrlWritestream)
                .on('finish', () => resolve(monthYear))
          })
        })
  })
  // http.get(url, ).pipe(fs.createWriteStream(saveZipToFile))
  //   .on('finish', ()=>{
  //   const zipReadstream = fs.createReadStream(saveZipToFile)
  // const xbrlWritestream = fs.createWriteStream(saveTo + '/file')
  // const unzip = zlib.createUnzip()
  // return new Promise(resolve => {
  //   zipReadstream
  //       .pipe(unzip)
  //       .pipe(xbrlWritestream)
  //       .on('finish', () => resolve(monthYear))
  //   })
  // })

}


// downloadAndUnzip('Accounts_Bulk_Data-2021-02-19.zip')

// fs.createReadStream(path.resolve(__dirname, 'zipped', '2021-02-19.zip'))
// .pipe(zlib.createUnzip())
// .pipe(fs.createWriteStream(path.resolve(__dirname, 'unzipped', '20221-02-29')))

