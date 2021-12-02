#!/bin/bash
name="sic"
file_ext="csv"

url="https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/527619/SIC07_CH_condensed_list_en.csv"
files_dir="./files"
tmp_filename="$files_dir/$name.$file_ext"

mkdir -p "$files_dir" # create if not exists

if test -f "$tmp_filename"; then
	echo "Already downloaded $name $file_ext file"
else
	echo "Downloading $name $file_ext file"
	wget -nv -O "$tmp_filename" "$url"
	echo "Finished downloading $name $file_ext file"
fi


gsutil -h "x-goog-meta-data-source-url:$url" mv "$tmp_filename" "gs://companies-house-data-sources/$name.$file_ext"