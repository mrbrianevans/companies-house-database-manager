#!/bin/bash

# authenticate gcloud with service account key. Requires env variable of key location
gcloud auth activate-service-account --key-file="${GOOGLE_APPLICATION_CREDENTIALS}"

# start PM2 processes
pm2-runtime processes.config.js
