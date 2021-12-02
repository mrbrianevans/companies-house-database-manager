#!/bin/bash

# This should download, unzip and copy to Google Cloud Storage the latest persons with significant control file


today=$(date +"%Y-%m-%d")
files_dir="./files"
tmp_zipname="$files_dir/psc-$today.zip"
tmp_filename="$files_dir/psc-$today.json"
original_name="persons-with-significant-control-snapshot-${today}"
url="http://download.companieshouse.gov.uk/$original_name.zip"

mkdir -p "$files_dir" # create if not exists

if test -f "$tmp_zipname"; then
	echo "Already downloaded psc ZIP"
else
	echo "Downloading psc zip"
	wget -nv -O "$tmp_zipname" "$url"
	echo "Finished downloading psc ZIP"
fi

if test -f "$tmp_filename"; then
	echo "PSC file already unzipped"
else
	echo "Unzipping PSC file from '$tmp_zipname'"
	unzip "$tmp_zipname" "$original_name.txt" -d "$files_dir"
	rm "$tmp_zipname" # delete zip file
	mv "$files_dir/$original_name.txt" "$tmp_filename" # rename
	echo "Finished unzipping psc file to '$tmp_filename'"
fi


gsutil mv "$tmp_filename" gs://companies-house-data-sources/psc.json