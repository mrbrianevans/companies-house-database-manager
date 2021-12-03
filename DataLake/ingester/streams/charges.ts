import {listenToStream} from "./listenToStream";
import {ChargesEvent} from "./eventTypes";


listenToStream<ChargesEvent.ChargesEvent>('charges', e => console.error(JSON.stringify(e, null, 1) + ','))
