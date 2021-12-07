// generated typescript definitions from database using groovy script
// import { FilterCategory } from './FilterCategory'

export interface IFilingEventsDatabaseItem {
  id?: string;
  category?: string;
  description_code?: string;
  description?: string;
  description_values?: Object;
  filing_date?: number;
  timepoint?: number;
  published?: number;
  captured?: number;
  barcode?: string;
  type?: string;
  company_number?: string;
}

export interface IFilingEventsItem {
  id?: string;
  category?: string;
  descriptionCode?: string;
  description?: string;
  descriptionValues?: Object;
  filingDate?: number;
  timepoint?: number;
  published?: number;
  captured?: number;
  barcode?: string;
  type?: string;
  companyNumber?: string;
}

export function convertFilingEventsDatabaseItemToItem(databaseItem: IFilingEventsDatabaseItem): IFilingEventsItem {
  const item: IFilingEventsItem = {
    id: databaseItem.id,
    category: databaseItem.category,
    descriptionCode: databaseItem.description_code,
    description: databaseItem.description,
    descriptionValues: databaseItem.description_values,
    filingDate: databaseItem.filing_date,
    timepoint: databaseItem.timepoint,
    published: databaseItem.published,
    captured: databaseItem.captured,
    barcode: databaseItem.barcode,
    type: databaseItem.type,
    companyNumber: databaseItem.company_number,
  }
  return item;
}
