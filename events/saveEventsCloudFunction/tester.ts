import {saveEventsToDb} from './index'

const startTime = Date.now()
saveEventsToDb()
    .then(() => console.log("Function execution finished in " + Math.round(Date.now() - startTime) + "ms"))
    .then(() => process.exit(0))
    .catch(e => console.error("Error occured:", e))
