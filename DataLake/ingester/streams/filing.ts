import {listenToStream} from "./listenToStream";
import {FilingEvent} from "./eventTypes";

listenToStream<FilingEvent.FilingEvent>('charges', e => console.error(JSON.stringify(e, null, 1) + ','))