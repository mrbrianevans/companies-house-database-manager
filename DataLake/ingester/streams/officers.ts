import {listenToStream} from "./listenToStream";
import {OfficerEvent} from "./eventTypes";

listenToStream<OfficerEvent.OfficerEvent>('officers')