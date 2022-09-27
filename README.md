# Companies House database manager

This was an attempt at maintaining a database of Companies House public data.
Since doing this, I have started again from scratch doing things slightly differently with
what I learnt from this project. There are many useful scripts and techniques in here, so I
have made it publicly available for everyone's benefit, but don't expect it all to be perfect.
I am no longer working on improving this repository (hence the archived status).

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

The `ingester` container in `docker-compose` is responsible for loading data from the original source into the MongoDB
data lake
(`dl` container in `docker-compose`).

### Data warehouse

PostgreSQL is used as a data warehouse.

The `trawler` container in `docker-compose` is used to pull data from the data lake and insert it into the SQL data
warehouse
(`sql` container in `docker-compose`). Scripts to load the data warehouse are written in TypeScript in
the `DataLake/trawler/loaders` directory. These scripts are also managed at runtime by pm2.

