import {listenToStream} from "./listenToStream";
import {PscEvent} from "./eventTypes";

listenToStream<PscEvent.PscEvent>('persons-with-significant-control')