const pivotAccountsTable = () => {
    //select list of 500 company numbers which are in accounts, but not wide_accounts
    const selectUndoneCompanyNumbers = `
        SELECT company_number
        FROM company_accounts
        WHERE
    `

    //loop through them, inserting them into wide accounts

    //
}
