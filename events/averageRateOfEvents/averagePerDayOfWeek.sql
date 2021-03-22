-- frequency graph of events:
WITH filing_frequency AS (SELECT date_trunc('day', published) AS date, count(*)
                          FROM filing_events
                          WHERE published > '2021-01-29'
                          GROUP BY date_trunc('day', published)
                          ORDER BY date_trunc('day', published)),
     company_frequency AS (SELECT date_trunc('day', published) AS date, count(*)
                           FROM company_events
                           WHERE published > '2021-01-29'
                           GROUP BY date_trunc('day', published)
                           ORDER BY date_trunc('day', published))
SELECT CASE
           WHEN filing_frequency.date IS NULL THEN company_frequency.date::date
           ELSE filing_frequency.date::date END             AS date,
       CASE
           WHEN filing_frequency.date IS NULL THEN date_part('dow', company_frequency.date)
           ELSE date_part('dow', filing_frequency.date) END AS day_of_week,
       filing_frequency.count                               AS filing_events,
       company_frequency.count                              AS company_events
FROM filing_frequency
         FULL OUTER JOIN company_frequency ON filing_frequency.date = company_frequency.date;
