#!/bin/bash

echo "Updating all files and loading into mongo data lake, could take 25 minutes"

./companies.sh
./psc.sh
./sic.sh
./postcodes.sh

echo "All files have been updated"