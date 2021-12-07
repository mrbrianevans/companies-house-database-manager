declare module IFilingHistory {

  export interface DescriptionValues {
    made_up_date: string;
    officer_name: string;
    change_date: string;
    description: string;
  }

  export interface Links {
    self: string;
    document_metadata: string;
  }

  export interface Capital {
    currency: string;
    figure: string;
  }

  export interface DescriptionValues2 {
    capital: Capital[];
    date: string;
  }

  export interface Data {
  }

  export interface AssociatedFiling {
    action_date: any;
    category: string;
    date: string;
    description: string;
    description_values: DescriptionValues2;
    type: string;
    data: Data;
  }

  export interface Item {
    action_date: string;
    category: string;
    date: string;
    description: string;
    description_values: DescriptionValues;
    links: Links;
    type: string;
    pages: number;
    barcode: string;
    transaction_id: string;
    associated_filings: AssociatedFiling[];
    paper_filed?: boolean;
    subcategory: string;
  }

  export interface IFilingHistory {
    total_count: number;
    start_index: number;
    items_per_page: number;
    filing_history_status: string;
    items: Item[];
  }

}
