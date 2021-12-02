#!/bin/bash
name="companies"
remote_name="BasicCompanyDataAsOneFile"
file_ext="csv"
# This should download, unzip and copy to Google Cloud Storage the latest basic company data file


files_dir="./files"
latest=$(date +"%Y-%m-01")
original_name="$remote_name-${latest}"
url="http://download.companieshouse.gov.uk/$original_name.zip"

mkdir -p "$files_dir" # create if not exists

if curl --output /dev/null --silent --head --fail "$url"; then
  echo "URL exists for this month: $latest"
else
  echo "URL does not exist, trying last months:"
#  goes back 5 days if the current months file isn't available yet
  latest=$(date --date="$(date +"%Y-%m-%d") -5 day" +"%Y-%m-01")
  original_name="$remote_name-${latest}"
  url="http://download.companieshouse.gov.uk/$original_name.zip"
  echo "$original_name"
fi

tmp_zipname="$files_dir/$name-$latest.zip"
tmp_filename="$files_dir/$name-$latest.$file_ext"

if test -f "$tmp_zipname"; then
	echo "Already downloaded $name ZIP"
else
	echo "Downloading $name zip"


	wget -nv -O "$tmp_zipname" "$url"
	echo "Finished downloading $name ZIP"
fi

if test -f "$tmp_filename"; then
	echo "$name file already unzipped"
else
	echo "Unzipping $name file from '$tmp_zipname'"
	unzip "$tmp_zipname" "$original_name.$file_ext" -d "$files_dir"
	rm "$tmp_zipname" # delete zip file
	mv "$files_dir/$original_name.$file_ext" "$tmp_filename" # rename
	echo "Finished unzipping $name file to '$tmp_filename'"
fi


gsutil -h "x-goog-meta-data-source-url:$url" mv "$tmp_filename" "gs://companies-house-data-sources/$name.$file_ext"