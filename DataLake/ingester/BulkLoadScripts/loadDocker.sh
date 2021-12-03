#!/bin/bash
# run with ./loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"

echo "Loading $1 to $2 into docker and google cloud storage"

tmp_filename=$1
name=$2
file_ext=$3
url=$4

# copy file to volume accessible to mongo container
mv "$tmp_filename" "/BulkFiles/$name.$file_ext"

# requires environment variables for authentication (~/data-manager/docker/.mongo.env)

# run mongo import on that copied file
mongoimport --db=lake --drop --file "/BulkFiles/$name.$file_ext" --type="$file_ext" \
 --username="$MONGO_INITDB_ROOT_USERNAME" --password="$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
 $([ "$file_ext" == "csv" ] && echo "--headerline") --numInsertionWorkers=2

# move to cloud
echo "Moving /BulkFiles/$name.$file_ext file to Google Cloud"
time gsutil -h "x-goog-meta-data-source-url:$url" mv "/BulkFiles/$name.$file_ext" "gs://companies-house-data-sources/$name.$file_ext"