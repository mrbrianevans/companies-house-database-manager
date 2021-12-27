create table companies
(
    last_updated                          timestamp default current_timestamp,
    company_name                          text not null,
    company_number                        char(8)
        constraint companies_pkey
            primary key,
    postcode                              text,
    address_line_1                        text,
    category                              text,
    status                                text,
    origin_country                        text,
    incorporation_date                    date,
    dissolution_date                      date,
    previous_names                        text[],
    can_file                              boolean,
    accounts_category                     text,
    accounts_ref_day                      smallint,
    accounts_ref_month                    smallint,
    accounts_next_due                     date,
    accounts_last_made_up                 date,
    returns_next_due                      date,
    returns_last_made_up                  date,
    confirmation_statement_next_due       date,
    confirmation_statement_last_made_up   date,
    sic_codes                             text[],
    mortgages_charges                     smallint,
    mortgages_outstanding                 smallint,
    mortgages_part_satisfied              smallint,
    mortgages_satisfied                   smallint,
    gen_partners                          smallint,
    limited_partners                      smallint,
    latest_accounts_filing_id             text,
    balance_sheet_date                    date,
    accountants                           text,
    accounting_software                   text,
    employees                             numeric,
    current_assets                        numeric,
    cash_at_bank                          numeric,
    debtors                               numeric,
    creditors                             numeric,
    fixed_assets                          numeric,
    net_assets                            numeric,
    total_assets_less_current_liabilities numeric,
    equity                                numeric,
    revenue                               numeric,
    profit                                numeric,
    accounts_officers                     text[],
    dormant                               boolean,
    net_current_assets                    numeric,
    start_date                            date,
    end_date                              date
);

