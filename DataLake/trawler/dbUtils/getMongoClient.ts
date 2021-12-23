import {MongoClient} from "mongodb"

export const getMongoClient = async (user: 'eventer' | 'importer' = 'eventer') => {
    const mongo = new MongoClient("mongodb://dl:27017", {
        auth: user === 'importer' ? {
            username: process.env.MONGO_IMPORT_USER,
            password: process.env.MONGO_IMPORT_PASSWORD
        } : {
            username: process.env.MONGO_EVENT_USER,
            password: process.env.MONGO_EVENT_PASSWORD
        }, authSource: 'admin'
    })
    await mongo.connect()
    return mongo
}