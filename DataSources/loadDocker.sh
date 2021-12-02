#!/bin/bash
# run with ./loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"

echo "Loading $1 to $2 into docker and google cloud storage"

tmp_filename=$1
name=$2
file_ext=$3
url=$4

container_name="docker-dl-1"
# create volume if not exists
docker volume create DataSourceFiles
# copy file to volume accessible to mongo container
docker cp "$tmp_filename" "$container_name:/DataSourceFiles/$name.$file_ext"

# requires environment variables for authentication (~/data-manager/docker/.mongo.env)

# run mongo import on that copied file
time docker exec "$container_name" mongoimport --db=lake --drop --file "/DataSourceFiles/$name.$file_ext" --type="$file_ext" \
 --username="$MONGO_INITDB_ROOT_USERNAME" --password="$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin \
 $([ "$file_ext" == "csv" ] && echo "--headerline") --numInsertionWorkers=2

# move to cloud
echo "Moving $tmp_filename file to Google Cloud"
time gsutil -h "x-goog-meta-data-source-url:$url" mv "$tmp_filename" "gs://companies-house-data-sources/$name.$file_ext"