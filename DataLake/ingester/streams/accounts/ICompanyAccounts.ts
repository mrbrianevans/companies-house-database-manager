// generated typescript definitions from database using groovy script
// import { FilterCategory } from './FilterCategory'

export interface ICompanyAccountsDatabaseItem {
	company_number: string;
	name: string;
	label: string;
	context_ref: string;
	value: string;
	start_date?: number;
	end_date: number;
	unit?: string;
	decimals?: number;
	captured?: number;
}

export interface ICompanyAccountsItem {
	companyNumber: string;
	name: string;
	label: string;
	contextRef: string;
	value: string;
	startDate?: number;
	endDate: number;
	unit?: string;
	decimals?: number;
	captured?: number;
}

export function convertCompanyAccountsDatabaseItemToItem(databaseItem: ICompanyAccountsDatabaseItem): ICompanyAccountsItem {
	const item: ICompanyAccountsItem = {
		companyNumber: databaseItem.company_number,
		name: databaseItem.name,
		label: databaseItem.label,
		contextRef: databaseItem.context_ref,
		value: databaseItem.value,
		startDate: databaseItem.start_date,
		endDate: databaseItem.end_date,
		unit: databaseItem.unit,
		decimals: databaseItem.decimals,
		captured: databaseItem.captured,
	}
	return item;
}
