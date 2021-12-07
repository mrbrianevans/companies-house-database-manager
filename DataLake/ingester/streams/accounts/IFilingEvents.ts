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

// filing-history companies house api response
export declare module FilingHistory {
  export interface IFilingHistory {
    total_count: number
    filing_history_status: 'filing-history-available' | string
    // this is either 0 or a quoted string if specified (eg '35')
    start_index: number | string
    items: FilingHistoryItem[]
    items_per_page: number
  }

  export interface FilingHistoryItem {
    // this is usually a date string
    action_date?: string
    category: string
    date: string
    description: string
    description_values?: Record<string, string>
    resolutions?: {
      category: string
      type: string
      subcategory: string
      description: string
      receiveDate?: string
    }[]
    subcategory?: string
    links?: {
      self: string
      document_metadata: string
    }
    type: string
    paper_filed?: boolean
    pages?: number
    transaction_id: string
    barcode: string
    associated_filings?: AssociatedFiling[]
  }

  export interface AssociatedFiling {
    // this is usually milliseconds
    action_date: number
    category: string
    date: string
    description: string
    data?: {}
    description_values: {
      capital?: [
        {
          currency: string
          figure: string
        }
      ]
      date?: string
      made_up_date?: string
    }
    type: string
  }
}