// generated typescript definitions from database using groovy script
// import { FilterCategory } from './FilterCategory'

export interface IAccountsScannedDatabaseItem {
	filename?: string;
	time_started?: number;
	company_number: string;
	accounts_date: Date;
	status?: string;
	time_finished?: number;
	zip_file_date?: number;
	csv_scanned?: number;
	number_of_facts?: number;
	number_of_long_facts?: number;
	errors?: string;
}

export interface IAccountsScannedItem {
	filename?: string;
	timeStarted?: number;
	companyNumber: string;
	accountsDate: Date;
	status?: string;
	timeFinished?: number;
	zipFileDate?: number;
	csvScanned?: number;
	numberOfFacts?: number;
	numberOfLongFacts?: number;
	errors?: string;
}

export function convertAccountsScannedDatabaseItemToItem(databaseItem: IAccountsScannedDatabaseItem): IAccountsScannedItem {
	const item: IAccountsScannedItem = {
		filename: databaseItem.filename,
		timeStarted: databaseItem.time_started,
		companyNumber: databaseItem.company_number,
		accountsDate: databaseItem.accounts_date,
		status: databaseItem.status,
		timeFinished: databaseItem.time_finished,
		zipFileDate: databaseItem.zip_file_date,
		csvScanned: databaseItem.csv_scanned,
		numberOfFacts: databaseItem.number_of_facts,
		numberOfLongFacts: databaseItem.number_of_long_facts,
		errors: databaseItem.errors,
	}
	return item;
}
