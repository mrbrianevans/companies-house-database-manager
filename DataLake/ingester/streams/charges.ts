import {listenToStream} from "./listenToStream";
import {ChargesEvent} from "./eventTypes";


listenToStream<ChargesEvent.ChargesEvent>('charges')
