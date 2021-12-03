#!/bin/bash
echo "Downloading SIC codes file and moving to Google Cloud Storage. Usually takes ~ 1 second"

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

chmod +x /BulkLoadScripts/loadDocker.sh
/BulkLoadScripts/loadDocker.sh "$tmp_filename" "$name" "$file_ext" "$url"