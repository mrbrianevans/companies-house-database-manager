import {listenToStream} from "./listenToStream";
import {InsolvencyEvent} from "./eventTypes";

listenToStream<InsolvencyEvent.InsolvencyEvent>('insolvencies', e => e.data.etag)