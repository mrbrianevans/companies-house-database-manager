import {MongoClient} from "mongodb"

export const getMongoClient = async () => {
  const mongo = new MongoClient("mongodb://dl:27017", {
    auth: {
      username: process.env.MONGO_EVENT_USER,
      password: process.env.MONGO_EVENT_PASSWORD
    }, authSource: 'admin'
  })
  await mongo.connect()
  return mongo
}