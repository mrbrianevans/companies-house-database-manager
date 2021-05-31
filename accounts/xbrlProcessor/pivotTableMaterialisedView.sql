-- I can't get this to work. I need an SQL expert
CREATE MATERIALIZED VIEW wide_accounts_first_million AS
WITH list_rows AS (
    SELECT a.company_number, a.end_date
    FROM company_accounts a
    GROUP BY a.company_number, a.end_date
    ORDER BY a.end_date, a.company_number
    LIMIT 1000000 OFFSET 0
)
SELECT r.company_number,
       r.end_date::date as date,
       (WITH comp_accounts AS (
           SELECT *
           FROM company_accounts b
           WHERE b.company_number = r.company_number
       )
        SELECT ARRAY [
                   --                (
--                    SELECT value::date
--                    FROM comp_accounts
--                    WHERE label = 'Balance sheet date'
--                    LIMIT 1
--                )
-- --                     AS balance_sheet
--                ,
--                (
--                    SELECT value::date
--                    FROM comp_accounts
--                    WHERE label = 'End date for period covered by report'
--                    LIMIT 1
--                )
-- --                     AS report_end_date
--                ,
--        (
--            SELECT value::date
--            FROM comp_accounts
--                    WHERE label = 'Start date for period covered by report'
--            LIMIT 1
--        )
-- --            AS report_start_date
--                ,
--        (
--            SELECT value
--            FROM comp_accounts
--                    WHERE label = 'Entity current legal or registered name'
--            LIMIT 1
--        )
-- --            AS legal_name
--                ,
--        (
--            SELECT value
--            FROM comp_accounts
--                    WHERE label = 'Name of entity accountants'
--            LIMIT 1
--        )
-- --            AS accountants
--                ,
--        (
--            SELECT value
--            FROM comp_accounts
--                    WHERE label = 'Name of production software'
--            LIMIT 1
--        )
-- --            AS accouting_software
--                ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Average number of employees during the period'
                   )
--            AS employees
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Current assets'
                   )
--            AS current_assets
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Cash at bank and on hand'
                   )
--            AS cash_at_bank
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Debtors'
                   )
--            AS debtors
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Creditors'
                   )
--            AS creditors
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Fixed assets'
                   )
--            AS fixed_assets
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Net assets (liabilities)'
                   )
--            AS net_assets
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Total assets less current liabilities'
                   )
--            AS total_assets_less_current_liabilities
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Equity'
                   )
--            AS equity
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Turnover / revenue'
                   )
--            AS revenue
                   ,
                   (
                       SELECT CASE
                                  WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                                      THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                                  ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
                       FROM comp_accounts
                       WHERE label = 'Profit (loss)'
                   )
                   --            AS profit
--                ,
--        (
--            SELECT postcode
--            FROM companies b
--            WHERE b.number = company_number
--        )
-- --            AS post_code
--                ,
--        (
--            SELECT ARRAY_AGG(DISTINCT value)
--            FROM comp_accounts
--                    WHERE label = 'Name of entity officer'
--        )
--            AS officers
                   ]
       )

FROM list_rows r
GROUP BY r.company_number, r.end_date::date
;
-- 25 minutes to do a million (the old way)

-- partitian companies in quarters
SELECT COUNT(*)
FROM companies;



REFRESH MATERIALIZED VIEW wide_accounts;
-- run this frequently (takes an hour)
WITH list_rows AS (
    SELECT a.company_number, a.end_date
    FROM company_accounts a
    GROUP BY a.company_number, a.end_date
)
SELECT COUNT(*)
FROM list_rows;

SELECT COUNT(DISTINCT company_number) as companies, COUNT(company_number) as total
FROM wide_accounts_million;

SELECT wide_accounts_million.*,
--        detailed_postcodes.county,
       detailed_postcodes.built_up_area AS area
FROM wide_accounts_million
         INNER JOIN detailed_postcodes
                    ON postcode = post_code
WHERE wide_accounts_million.legal_name IS NOT NULL
  AND detailed_postcodes.county = 'Somerset';


SELECT *
FROM company_accounts
WHERE;


CREATE MATERIALIZED VIEW short_list_accounts AS
SELECT a.company_number, a.end_date
FROM company_accounts a
WHERE label = 'UK Companies House registered number'
  AND a.value = a.company_number
GROUP BY a.company_number, a.end_date
ORDER BY a.end_date, a.company_number;

SELECT COUNT(*) as total, COUNT(distinct company_number) as unique_companies
FROM short_list_accounts;

CREATE UNIQUE INDEX ON short_list_accounts (company_number, end_date);

--todo: make the list_accounts table only have rows for actual accounts which were filed,
-- rather than both the row for the year that was filed, and the year prior. get rid of the previous year row
-- that should cut the size of the table in half, and maybe make it achievable in one go
-- and make company numbers unique so there is only one entry in the final data dump for each company
-- (with its most recent accounts)

WITH south_west_accountants AS (
    SELECT accountants                          AS name
         , string_agg(accouting_software, ', ') AS software
    FROM wide_accounts_south_west
    WHERE accountants IS NOT NULL
    GROUP BY accountants
)
SELECT name,
       (
           SELECT COUNT(distinct company_number)
           FROM company_accounts a
           WHERE a.value = swa.name
             AND a.label = 'Name of entity accountants'
       ) AS number_of_clients,
       (
           SELECT
       )

FROM south_west_accountants swa
WHERE (
          SELECT COUNT(*)
          FROM wide_accounts_south_west swa
          WHERE swa.accountants = name
      ) > 5
;


-- long version (1 million at a time, reduce offset each time)
CREATE MATERIALIZED VIEW wide_accounts_south_west AS
SELECT r.company_number,
--        r.end_date::date as end_date,
--        (
--            SELECT value::date
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Balance sheet date'
--            LIMIT 1
--        ) AS balance_sheet_date,
--        (
--            SELECT value::date
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'End date for period covered by report'
--            LIMIT 1
--        )                AS report_end_date,
--        (
--            SELECT value::date
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Start date for period covered by report'
--            LIMIT 1
--        )                AS report_start_date,
--        (
--            SELECT value
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Entity current legal or registered name'
--            LIMIT 1
--        )                AS legal_name,
       (
           SELECT value
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Name of entity accountants'
           LIMIT 1
       ) AS accountants,
       (
           SELECT value
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Name of production software'
           LIMIT 1
       ) AS accouting_software,
       (
           SELECT MAX(TO_NUMBER(value, '999,999,999,999'))
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Average number of employees during the period'
       ) AS employees
--        ,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Current assets'
--        )                AS current_assets,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Cash at bank and on hand'
--        )                AS cash_at_bank,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Debtors'
--        )                AS debtors,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Creditors'
--        )                AS creditors,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Fixed assets'
--        )                AS fixed_assets,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Net assets (liabilities)'
--        )                AS net_assets,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Total assets less current liabilities'
--        )                AS total_assets_less_current_liabilities,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Equity'
--        )                AS equity,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Turnover / revenue'
--        )                AS revenue,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Profit (loss)'
--        )                AS profit,
--        (
--            SELECT postcode
--            FROM companies b
--            WHERE b.number = r.company_number
--        )                AS post_code
--        (
--            SELECT ARRAY_AGG(DISTINCT value)
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Name of entity officer'
--        )                AS officers
FROM short_list_accounts r,
     companies c,
     detailed_postcodes d
WHERE r.company_number = c.number
  AND c.postcode = d.postcode
  AND (d.county = 'Somerset' OR d.county = 'Devon' OR d.county = 'Dorset')
-- , accounts b WHERE b.company_number=r.company_number AND b.end_date=r.end_date
-- LIMIT 681126
LIMIT 1362251
--     OFFSET 1362251
; -- 25 minutes to do a million, failed on 4 million, trying 2 million

CREATE INDEX ON company_accounts (company_number, end_date);
-- long version with JOIN (1 million at a time, increase offset each time)
CREATE MATERIALIZED VIEW wide_accounts_first_million AS;
WITH matched_accounts AS (SELECT *
                          FROM list_accounts r
                                   JOIN company_accounts b ON b.company_number = r.company_number AND
                                                      b.end_date = r.end_date
                          LIMIT 100 OFFSET 0)
SELECT matched_accounts.company_number,
       matched_accounts.end_date::date as end_date,
       (
           SELECT value::date
           FROM matched_accounts
           WHERE label = 'Balance sheet date'
           LIMIT 1
       )                               AS balance_sheet_date,
       (
           SELECT value::date
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'End date for period covered by report'
           LIMIT 1
       )                               AS report_end_date,
       (
           SELECT value::date
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Start date for period covered by report'
           LIMIT 1
       )                               AS report_start_date,
       (
           SELECT value
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Entity current legal or registered name'
           LIMIT 1
       )                               AS legal_name,
       (
           SELECT value
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Name of entity accountants'
           LIMIT 1
       )                               AS accountants,
       (
           SELECT value
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Name of production software'
           LIMIT 1
       )                               AS accouting_software,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Average number of employees during the period'
       )                               AS employees,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Current assets'
       )                               AS current_assets,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Cash at bank and on hand'
       )                               AS cash_at_bank,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Debtors'
       )                               AS debtors,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Creditors'
       )                               AS creditors,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Fixed assets'
       )                               AS fixed_assets,
       (
           SELECT CASE
                      WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
                          THEN MAX(TO_NUMBER(value, '999,999,999,999'))
                      ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
           FROM company_accounts b
           WHERE b.company_number = r.company_number
             AND b.end_date = r.end_date
             AND label = 'Net assets (liabilities)'
       )                               AS net_assets,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Total assets less current liabilities'
--        )                AS total_assets_less_current_liabilities,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Equity'
--        )                AS equity,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Turnover / revenue'
--        )                AS revenue,
--        (
--            SELECT CASE
--                       WHEN AVG(TO_NUMBER(value, '999,999,999,999')) > 0
--                           THEN MAX(TO_NUMBER(value, '999,999,999,999'))
--                       ELSE MIN(TO_NUMBER(value, '999,999,999,999')) END
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Profit (loss)'
--        )                AS profit,
       (
           SELECT postcode
           FROM companies bc
           WHERE bc.number = r.company_number
       )                               AS post_code
--        (
--            SELECT ARRAY_AGG(DISTINCT value)
--            FROM accounts b
--            WHERE b.company_number = r.company_number
--              AND b.end_date = r.end_date
--              AND label = 'Name of entity officer'
--        )                AS officers
FROM short_list_accounts r
