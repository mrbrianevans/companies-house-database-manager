import {listenToStream} from "./listenToStream";
import {PscEvent} from "./eventTypes";

listenToStream<PscEvent.PscEvent>('charges', e => console.error(JSON.stringify(e, null, 1) + ','))