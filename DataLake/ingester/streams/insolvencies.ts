import {listenToStream} from "./listenToStream";
import {InsolvencyEvent} from "./eventTypes";

listenToStream<InsolvencyEvent.InsolvencyEvent>('insolvency-cases', e => e.data.etag)