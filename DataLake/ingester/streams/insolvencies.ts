import {listenToStream} from "./listenToStream";
import {InsolvencyEvent} from "./eventTypes";

listenToStream<InsolvencyEvent.InsolvencyEvent>('charges', e => console.error(JSON.stringify(e, null, 1) + ','))