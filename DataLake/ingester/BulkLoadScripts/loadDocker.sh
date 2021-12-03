#!/bin/bash
# run with ./loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"

echo "Loading $1 to $2 into docker and google cloud storage"

tmp_filename=$1
name=$2
file_ext=$3
url=$4

# requires environment variables for authentication (~/data-manager/docker/.mongo.env)

# run mongo import on that copied file
mongoimport --db=bulk --drop --file "$tmp_filename" --type="$file_ext" \
 --username="$MONGO_INITDB_ROOT_USERNAME" --password="$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
 $([ "$file_ext" == "csv" ] && echo "--headerline") --numInsertionWorkers=1 --host=dl --quiet

# move to cloud
echo "Moving $tmp_filename file to Google Cloud"
time gsutil -h "x-goog-meta-data-source-url:$url" mv "$tmp_filename" "gs://companies-house-data-sources/$name.$file_ext"