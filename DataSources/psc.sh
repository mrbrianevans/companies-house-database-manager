#!/bin/bash
echo "Persons with significant control: download, unzip, move to Google Cloud Storage. Usually takes ~11 minutes"

name="psc"
file_ext="json"
remote_name="persons-with-significant-control-snapshot"
# This should download, unzip and copy to Google Cloud Storage the latest persons with significant control file


today=$(date +"%Y-%m-%d")
files_dir="./files"
tmp_zipname="$files_dir/$name-$today.zip"
tmp_filename="$files_dir/$name-$today.$file_ext"
original_name="$remote_name-${today}"
url="http://download.companieshouse.gov.uk/$original_name.zip"

mkdir -p "$files_dir" # create if not exists

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
	unzip "$tmp_zipname" "$original_name.txt" -d "$files_dir"
	rm "$tmp_zipname" # delete zip file
	mv "$files_dir/$original_name.txt" "$tmp_filename" # rename
	echo "Finished unzipping $name file to '$tmp_filename'"
fi


./loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"