import {getMongoClient} from "./getMongoClient";
import {MongoError} from "mongodb";


export const saveEventToMongo = <EventType>(collection: string, modifier: (e: EventType) => { _id: string } = (e) => ({
  ...e,
  _id: 'null'
})) => async (e: EventType) => {
  const newEvent = modifier(e)
  const mongo = await getMongoClient()
  try {
    // @ts-ignore I cannot get the type override of _id to allow a string value
    await mongo.db('events').collection(collection).insertOne(newEvent)
    console.log('Inserted event in', `events.${collection}`, `id=${newEvent._id}`)
  } catch (e) {
    // if its a duplicate event, do nothing. otherwise, escalate error
    if (e instanceof MongoError && e.code != 11000) throw e
  }
  await mongo.close()
}