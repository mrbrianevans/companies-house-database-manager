#!/bin/bash
# run with ./loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"


tmp_filename=$1
name=$2
file_ext=$3
url=$4

# requires environment variables for authentication (~/data-manager/docker/.mongo.env)

echo "Loading $1 to $2 collection in mongo"
# run mongo import on that copied file
mongoimport --db=bulk --collection="$name" --drop --file "$tmp_filename" --type="$file_ext" \
 --username="$MONGO_IMPORT_USER" --password="$MONGO_IMPORT_PASSWORD" --authenticationDatabase admin \
 $([ "$file_ext" == "csv" ] && echo "--headerline") --numInsertionWorkers=1 --host=dl --quiet

# move to cloud, compresses with gzip (-Z)
storage_class="standard" #can be standard, nearline, coldline or archive
echo "Moving $tmp_filename file to Google Cloud Storage"
time gsutil -q -h "x-goog-meta-data-source-url:$url" mv -Z -s "$storage_class" "$tmp_filename" "gs://companies-house-data-sources/$name.$file_ext"