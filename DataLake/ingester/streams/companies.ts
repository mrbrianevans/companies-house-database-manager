import {listenToStream} from "./listenToStream";
import {CompanyProfileEvent} from "./eventTypes";


listenToStream<CompanyProfileEvent.CompanyProfileEvent>('companies', e => console.error(JSON.stringify(e, null, 1) + ','))
