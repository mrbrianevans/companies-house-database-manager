import {listenToStream} from "./listenToStream";
import {OfficerEvent} from "./eventTypes";

listenToStream<OfficerEvent.OfficerEvent>('charges', e => console.error(JSON.stringify(e, null, 1) + ','))