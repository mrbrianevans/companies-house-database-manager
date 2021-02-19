import {processHtmlFile} from './processFile'
import * as fs from "fs";

export const processFolder = (folderName) => {
    const files = fs.readdir(folderName, (err, filename) => {
        processHtmlFile(filename)
    })
}
