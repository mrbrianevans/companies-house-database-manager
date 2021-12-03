import {listenToStream} from "./listenToStream";
import {CompanyProfileEvent} from "./eventTypes";


listenToStream<CompanyProfileEvent.CompanyProfileEvent>('companies', e => e.data.etag)
