#include "readFile.h"

extern int readFile(char *filename, char *outputFilename){
   // extract this out
   FILE *outputPersonCsv;
   fopen_s(&outputPersonCsv, outputFilename, "w");

   FILE *filepointer;
   fopen_s(&filepointer, filename, "r");
   if( !filepointer )
   {
      fprintf(stderr,
              "Cannot open file %s. Error: %s\n",
              filename, strerror(errno));
      fflush(stderr);
      return -1; /* non-zero return value for error. negative for fatal error */
   }
   printf("Reading file %s\n", filename);
   // file read successfully
   char headerIdentifier[9];
   int runNumber;
   char productionDate[9];
   if(fscanf(filepointer, "%8s%4d%8s", headerIdentifier, &runNumber, productionDate) == 3)
      printf("File type: %s. Run number: %d. Date of production: %s. \n", headerIdentifier, runNumber, productionDate);
   else{
      fprintf(stderr, "Failed to read header record");
      return 2;
   }
   char row[1000];
   // todo: make fileRows an array of the 1,000 most recent rows. To save to CSV and query in Postgres
   FileRow* fileRow = NULL;
   if((fileRow = (FileRow *)malloc(sizeof(FileRow)))==NULL){
      printf("Failed to allocate memory to file row\n");
      return 1;
   }
   writePersonCsvHeaders(outputPersonCsv); // write CSV headers to the output file
   int counter = 0, companyCounter = 0, personCounter = 0, unknownCounter = 0, scanFails = 0;
   int variableDataLength;
   clock_t startTime = clock();
   int beginningOfLinePos;
   // ---------------- loop through each line of the file ----------------------
   for (
         char * hasNext = fgets(fileRow->companyNumber, 9, filepointer);
         hasNext && (fileRow->companyNumber == NULL || strcmp(fileRow->companyNumber, "99999999") != 0);
         hasNext = fgets(fileRow->companyNumber, 9, filepointer)
      )
   {
      beginningOfLinePos = ftell(filepointer) - 8; // minus eight for the company number taken off
      counter++;
      fileRow->recordType = fgetc(filepointer);
// if(counter>  20000) break;
      if(fileRow->recordType == '1'){
         // printf("Company record for company number %s", fileRow->companyNumber);
         companyCounter++;
      }else if(fileRow->recordType == '2'){
         personCounter++;
         int scanned = fscanf(filepointer, "%1s%2hd%12s", &fileRow->appDateOrigin, &fileRow->appointmentType, fileRow->personNumber);
         if(scanned != 3){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            //todo: add this line to an error log file
            continue;
            printf("Unexpected number of scanned arguments from string. Expected %d, actual %d", 3, scanned);
         }
         fileRow->corporateIndicator = fgetc(filepointer);
         scanned = fscanf(filepointer, "%*[ ]%8[0-9 ]%8[0-9 ]%8[0-9 A-Z]%8[0-9 ]%8[0-9 ]%4d", fileRow->appointmentDate, fileRow->resignationDate, fileRow->personPostCode, fileRow->partialDateOfBirth, fileRow->fullDateOfBirth, &fileRow->variableDataLength);
         if(scanned != 6){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            //todo: add this line to an error log file
            continue;
            printf("Unexpected number of scanned arguments from string. Expected %d, actual %d: company number: %s\n", 6, scanned, fileRow->companyNumber);
            printf("appointmentDate:%8s,resignationDate:%8s,personPostCode:%8s,partialDateOfBirth:%8s,fullDateOfBirth:%8s,variableDataLength:%4d\n", fileRow->appointmentDate, fileRow->resignationDate, fileRow->personPostCode, fileRow->partialDateOfBirth, fileRow->fullDateOfBirth, fileRow->variableDataLength);
         }
         fileRow->variableData = malloc(sizeof(char) * (fileRow->variableDataLength + 1));
         // fileRow->variableData = malloc(1000);
         if(fileRow->variableData == NULL){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            //todo: add this line to an error log file
            fprintf(stderr, "Failed to allocated memory on line %d: %s", counter, row);
            continue;
         }
         fgets(fileRow->variableData, fileRow->variableDataLength, filepointer);
         // fgets(fileRow->variableData, sizeof fileRow->variableData, filepointer);
         // trying to ensure that I've actually reached the end of the line
         // printf("Next character is a |%c|\n", fgetc(filepointer));
         // char nextCharacter = fgetc(filepointer);
         // char nextCharacter = fileRow->variableData[strlen(fileRow->variableData)-1];
         // if(nextCharacter != '<'){
         //    scanFails++;
         //    fseek(filepointer, beginningOfLinePos, SEEK_SET);
         //    fgets(row, 1000, filepointer);
         //    //todo: add this line to an error log file
         //    continue;
         //    fprintf(stderr,"Line ending is not a < but a |%c| on line %d, person %s\n", nextCharacter, counter, fileRow->personNumber);
         // }else if(strcmp(fileRow->personNumber, "252347640001")==0){
         //    printf("Antonio passed the check\n");
         // }
         // scanned = sscanf(fileRow->variableData, "%*s<%*s<%*s<%*s<%*s<%*s<%*s<%*s<%*s<%*s<%*s<%*s<%*s");
         // if(scanned==13){
         //    printf("Scanned %d variables", scanned);
         // }else{
         //    printf("Didn't scanned %d variables", scanned);
         // }
         writePersonCsvLine(outputPersonCsv,fileRow);
         // to debug, uncomment this line
         // writePersonCsvLine(outputPersonCsv,stdout);
      }else{
         unknownCounter++;
         fseek(filepointer, beginningOfLinePos, SEEK_SET);
         fgets(row, 1000, filepointer);
         fprintf(stderr, "Unexpected record type on line %d: %c\n%s\n", counter, fileRow->recordType, row);
         //todo: add this line to an error log file
         continue;
      }
      fgets(row, 1000, filepointer);

   }
   if(strcmp(fileRow->companyNumber, "99999999") != 0){
      fprintf(stderr, "No tail record found\n");
      return 5;
   }
   // ------------- read tail record --------------------------
   beginningOfLinePos = ftell(filepointer) - 8; // minus eight for the company number taken off
   fseek(filepointer, beginningOfLinePos, SEEK_SET);
   int recordCount;
   if(fscanf(filepointer, "%*8[9]%8d", &recordCount) == 1)
   {
      // printf("%d records in file\n", recordCount);
   }
   else{
      fseek(filepointer, beginningOfLinePos, SEEK_SET);
      fgets(row, 1000, filepointer);
      fprintf(stderr, "Failed to read tail record: %s", row);
   }
   if(counter != recordCount || counter != companyCounter + personCounter){
      fprintf(stderr, "Failed to read the correct number of records. Expected: %d, actual %d", recordCount, companyCounter + personCounter);
   }
   clock_t timeTaken = clock() - startTime;
   double secondsTaken = 1.0 * timeTaken / CLOCKS_PER_SEC;
   double averagePerThousand = secondsTaken / counter * 1000000;
   printf("Read %d lines in %.3f sec. Average %.3f sec per 1,000,000 rows\n", counter, secondsTaken, averagePerThousand);
   printf("%d company records, %d person records, %d unknown records, %d scan fails\n", companyCounter, personCounter, unknownCounter, scanFails);
   fclose(filepointer);
   fclose(outputPersonCsv);
   printf("File %s, %s closed\n", filename, outputFilename);
   free(fileRow);
   return 0;
};
