export interface MongoAccounts {
  _id: string;
  companyNumber: string;
  accountsDate: string;
  numberOfFacts: number;
  descriptionCode: string;
  description: string;
  descriptionValues: AccountsDescriptionValues;
  filingDate: string;
  barcode: string;
  type: string;
  facts: AccountsFacts[];
}

export interface AccountsDescriptionValues {
  made_up_date: string;
}

export interface AccountsFacts {
  label: string;
  value: string;
  startDate?: string;
  endDate: string;
  additionalInfo?: Record<string, string>
  info?: string
}