#!/bin/bash
name="postcodes"
file_ext="csv"
# This should download, unzip and copy to Google Cloud Storage the detailed postcodes file

files_dir="./files"
original_name="postcodes"
url="https://www.doogal.co.uk/files/$original_name.zip"

mkdir -p "$files_dir" # create if not exists

tmp_zipname="$files_dir/$name.zip"
tmp_filename="$files_dir/$name.$file_ext"

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