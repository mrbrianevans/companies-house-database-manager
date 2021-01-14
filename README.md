 # What is this unit for?

This compute unit / droplet is to load the database.

This should have a cron job to fetch data from Companies House and ingest it and save it in PostGreSQL Database.

Then the backend hosted on App Platform under companies-house-frontend will serve the database data to the frontend through nextJS.

The frontend will be a way to interact with it.
