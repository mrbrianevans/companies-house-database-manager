#!/bin/bash

# This should download, unzip and send to db the latest persons with significant control file

today=$(date +"%Y-%m-%d")
filename="$today"
dirname="/downloads/psc/zips"

if test -f "$dirname/$filename.zip"; then
	echo "Already downloaded psc ZIP"
else
	echo "Downloading psc zip"
	wget -nv -P $dirname https://
	echo "Finished downloading psc ZIP"
fi

unzipped_dir="/downloads/psc/unzipped"
if test -f "$unzipped_dir/$filename.json"; then
	echo "PSC file already unzipped"
else
	echo "Unzipping PSC file"
	unzip -o $unzipped_dir -d $dirname/$filename.zip 
	echo "Finished unzipping psc file"
fi

node ../psc-to-db.js ../downloads/psc/unzipped/$filename.json
