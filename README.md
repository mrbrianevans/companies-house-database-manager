# Companies House database manager

## Docker usage

Docker is used by this database manager to run the database engines and data loading scripts. Docker compose
configuration is in the `DataLake`
directory.

## Database pipeline

### Data lake

[MongoDB](https://brianevans.wiki/en/database/nosql/mongo)
is used as a datalake to store data imported from the original data sources. The general process for loading data is
this:

1. Download file
2. Unzip
3. `mongoimport` to database

These scripts are written in bash and located in
`DataLake/ingester/BulkLoadScripts`.

They are run on cron job timers by pm2, listed in
`DataLake/ingester/processes.config.js`.

### Data warehouse

PostgreSQL is used as a data warehouse.

