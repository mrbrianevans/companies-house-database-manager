#!/bin/bash

# OPTION 1 - using existing CSV
# download the csv from gsutil
# import into mongo
# delete file locally

# OPTION 2 - using original data file
# download the .dat file from another source
# run the executable on it, to convert to a csv (or 2 csv's)
# load those csv files into mongo with mongoimport
# upload them both to gsutil


# Implementation of option 1, at some point needs to be updated to option 2

files_dir="./files"
mkdir -p "$files_dir" # create if not exists
name="officers"
file_ext="csv"
tmp_filename="$files_dir/${name}.$file_ext"
url="gs://companies-house-data-sources/officers.csv"

gsutil cp "gs://companies-house-data-sources/officers.csv" "$name-tmp.$file_ext"

# convert separator/deliminator
xsv input -d "<" --no-quoting -o "$tmp_filename" "$name-tmp.$file_ext"
rm "$name-tmp.$file_ext"

chmod +x /BulkLoadScripts/loadDocker.sh
/BulkLoadScripts/loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"