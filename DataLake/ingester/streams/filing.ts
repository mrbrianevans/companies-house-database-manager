import {listenToStream} from "./listenToStream";
import {FilingEvent} from "./eventTypes";

listenToStream<FilingEvent.FilingEvent>('filing')