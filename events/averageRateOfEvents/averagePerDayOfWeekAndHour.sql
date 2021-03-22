-- frequency graph of events by hour and day of week:
WITH filing_frequency AS (SELECT date_trunc('hour', published) AS date, count(*)
                          FROM filing_events
                          GROUP BY date_trunc('hour', published)),
     company_frequency AS (SELECT date_trunc('hour', published) AS date, count(*)
                           FROM company_events
                           GROUP BY date_trunc('hour', published))
SELECT CASE
           WHEN filing_frequency.date IS NULL THEN date_part('dow', company_frequency.date)
           ELSE date_part('dow', filing_frequency.date) END AS                           day_of_week,
       CASE
           WHEN filing_frequency.date IS NULL THEN date_part('hour', company_frequency.date)
           ELSE date_part('hour', filing_frequency.date) END AS                          hour,
       ROUND(AVG(filing_frequency.count)) AS                                             avg_filing_events,
       ROUND(AVG(company_frequency.count)) AS                                            avg_company_events,
       MAX(filing_frequency.count) AS                                                    max_filing_events,
       MAX(company_frequency.count) AS                                                   max_company_events,
       ROUND(percentile_cont(0.95)
             within group ( order by company_frequency.count )) AS                       company_95th,
       ROUND(percentile_cont(0.95)
             within group ( order by filing_frequency.count )) AS                        filing_95th,
       ROUND(percentile_cont(0.05)
             within group ( order by company_frequency.count )) AS                       company_5th,
       ROUND(percentile_cont(0.05) within group ( order by filing_frequency.count )) AS  filing_5th
FROM filing_frequency
         FULL OUTER JOIN company_frequency ON filing_frequency.date = company_frequency.date
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour
;


-- this version doesn't do any aggregation. made for pandas practice in python:
WITH filing_frequency AS (SELECT date_trunc('hour', published) AS date, count(*)
                          FROM filing_events
                          WHERE published < NOW() - INTERVAL '1 week'
                          GROUP BY date_trunc('hour', published)),
     company_frequency AS (SELECT date_trunc('hour', published) AS date, count(*)
                           FROM company_events
                           WHERE published < NOW() - INTERVAL '1 week'
                           GROUP BY date_trunc('hour', published))
SELECT CASE
           WHEN filing_frequency.date IS NULL THEN TO_CHAR(company_frequency.date, 'Day')
           ELSE TO_CHAR(filing_frequency.date, 'Day') END  AS day_of_week,
       CASE
           WHEN filing_frequency.date IS NULL THEN TO_CHAR(company_frequency.date, 'HH24')
           ELSE TO_CHAR(filing_frequency.date, 'HH24') END AS hour,
       filing_frequency.count                              as filing_events,
       company_frequency.count                             as company_events
FROM filing_frequency
         FULL OUTER JOIN company_frequency ON filing_frequency.date = company_frequency.date
;
