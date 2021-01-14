# What is this unit for?

This compute unit / droplet is to load the database.

This should have a cron job to fetch data from Companies House and ingest it and save it in
PostGreSQL Database.

Then the backend hosted on App Platform under companies-house-frontend will serve the database data
to the frontend through nextJS.

The frontend will be a way to interact with it.

## Scripts to update the database:

### Basic company information

Download, unzip and process an individual zip file (parts or whole)

```shell
./get_latest_bcd.sh "filename of latest.zip"
```

Automatically download, unzip and process the 6 individual smaller downloads. Takes the date as an
arg (recommended)

```shell
./update_basic_parts.sh "date of latest eg: 2021-01-01"
```

Process a csv file which has already been downloaded and unzipped (with progress bar)

```shell
node companies-house-database-manager/basic-csv-to-db.js ../downloads/unzipped/name_of_file
```

### Financials

Downloads todays financial file, unzips and processes it

```shell
./process_financials.sh
```

Downloads a specific financial file, unzips and processes it

```shell
./process_financials.sh 2020-08-05
```

### Sic descriptions

Downloads a CSV of the latest SIC code descriptions and uploads them to the database

```shell
./update_sic_map.sh
```

## Schedule

Once a day should run `./process_financials.sh`

Once a month should run `./get_latest_bcd.sh`

Once a year should run `./update_sic_map.sh`
