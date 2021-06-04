#include "readFile.h"

extern int readFile(char *inputFilename, FILE *outputPersonCsv){

   FILE *filepointer;
   fopen_s(&filepointer, inputFilename, "r");
   if( !filepointer )
   {
      fprintf(stderr,
              "Cannot open file %s. Error: %s\n",
              inputFilename, strerror(errno));
      fflush(stderr);
      return -1; /* non-zero return value for error. negative for fatal error */
   }
   FILE *humanError;
   fopen_s(&humanError, "humanReadableErrors.txt", "a+");
   if( !humanError )
   {
      fprintf(stderr,
              "Cannot open file %s. Error: %s\n",
              "humanReadableErrors.txt", strerror(errno));
      fflush(stderr);
      return -1;
   }
   fprintf(humanError, "\n\n\n%s%s%s%s%s\n\n\n",
           "-------------------------------------",
           "Converting ", inputFilename, " to CSV",
           "-------------------------------------");
   FILE *machineError;
   fopen_s(&machineError, "errorRows.dat", "a+");
   if( !machineError )
   {
      fprintf(stderr,
              "Cannot open file %s. Error: %s\n",
              "errorRows.dat", strerror(errno));
      fflush(stderr);
      return -1;
   }
   fprintf(humanError, "Reading file %s\n", inputFilename);
   // file read successfully
   char headerIdentifier[9];
   int runNumber;
   char productionDate[9];
   if(fscanf(filepointer, "%8s%4d%8s", headerIdentifier, &runNumber, productionDate) == 3)
      fprintf(humanError, "File type: %s. Run number: %d. Date of production: %s. \n", headerIdentifier, runNumber, productionDate);
   else{
      fprintf(stderr, "Failed to read header record\n");
      fprintf(humanError, "Failed to read header record\n");
      return 2;
   }
   char row[1000];
   FileRow* fileRow = NULL;
   if((fileRow = (FileRow *)malloc(sizeof(FileRow)))==NULL){
      fprintf(stderr, "Failed to allocate memory to file row\n");
      fprintf(humanError, "Failed to allocate memory to file row\n");
      return 1;
   }
   int counter = 0, companyCounter = 0, personCounter = 0, unknownCounter = 0, scanFails = 0, linesWritten = 0;
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
         companyCounter++;
      }else if(fileRow->recordType == '2'){
         personCounter++;
         int scanned = fscanf(filepointer, "%1s%2hd%12s", &fileRow->appDateOrigin, &fileRow->appointmentType, fileRow->personNumber);
         if(scanned != 3){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            fprintf(machineError, "%s", row);
            fprintf(humanError, "Unexpected number of scanned arguments from string. Expected %d, actual %d\n", 3, scanned);
            fprintf(humanError, "Line: %d. Row: %s", __LINE__, row);
            continue;
         }
         fileRow->corporateIndicator = fgetc(filepointer);
         scanned = fscanf(filepointer, "%*[ ]%8[0-9 ]%8[0-9 ]%8[0-9 A-Z]%8[0-9 ]%8[0-9 ]%4d", fileRow->appointmentDate, fileRow->resignationDate, fileRow->personPostCode, fileRow->partialDateOfBirth, fileRow->fullDateOfBirth, &fileRow->variableDataLength);
         if(scanned != 6){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            fprintf(machineError, "%s", row);
            fprintf(humanError, "Unexpected number of scanned arguments from string. Expected %d, actual %d\n", 6, scanned);
            fprintf(humanError, "Line: %d. Row: %s", __LINE__, row);
            continue;
         }
         fileRow->variableData = malloc(sizeof(char) * (fileRow->variableDataLength + 1));
         // fileRow->variableData = malloc(1000);
         if(fileRow->variableData == NULL){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            fprintf(machineError, "%s", row);
            fprintf(stderr, "Failed to allocated memory on line %d, row number %d", __LINE__, counter);
            fprintf(humanError, "Failed to allocated memory on line %d, row number %d", __LINE__, counter);
            continue;
         }
         fgets(fileRow->variableData, fileRow->variableDataLength, filepointer);
         // this checks that there are exactly 13 chevrons in the variable data
         int chevronCounter = 0;
         for (int i = 0; i < strlen(fileRow->variableData); ++i)
         {
            if(fileRow->variableData[i] == '<') chevronCounter++;
         }
         if(chevronCounter!=13){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            fprintf(machineError, "%s", row);
            fprintf(humanError, "Unexpected number of chevrons in variable data. Expected %d, actual %d\n", 13, chevronCounter);
            fprintf(humanError, "Line: %d. Row: %s", __LINE__, row);
            continue;
         }
         writePersonCsvLine(outputPersonCsv,fileRow);
         linesWritten++;
         free(fileRow->variableData);
      }else{
         unknownCounter++;
         fseek(filepointer, beginningOfLinePos, SEEK_SET);
         fgets(row, 1000, filepointer);
         fprintf(machineError, "%s", row);
         fprintf(humanError, "Unexpected record type on line %d: '%c'\n", counter, fileRow->recordType);
         fprintf(humanError, "Line: %d. Row: %s", __LINE__, row);
         //todo: add this line to an error log file
         continue;
      }
      fgets(row, 1000, filepointer);

   }
   if(strcmp(fileRow->companyNumber, "99999999") != 0){
      fprintf(stderr, "No tail record found\n");
      fprintf(humanError, "No tail record found\n");
      return 5;
   }
   fprintf(stdout, "Wrote %d lines to CSV\n", linesWritten);
   fprintf(humanError, "Wrote %d lines to CSV\n", linesWritten);
   // ------------- read tail record --------------------------
   beginningOfLinePos = ftell(filepointer) - 8; // minus eight for the company number taken off
   fseek(filepointer, beginningOfLinePos, SEEK_SET);
   int recordCount;
   if(fscanf(filepointer, "%*8[9]%8d", &recordCount) == 1)
   {
      fprintf(humanError, "Number of records expected in file(from tail record): %d\n", recordCount);
   }
   else{
      fseek(filepointer, beginningOfLinePos, SEEK_SET);
      fgets(row, 1000, filepointer);
      fprintf(stderr, "Failed to read tail record\n");
      fprintf(humanError, "Failed to read tail record\n");
      fprintf(humanError, "Line: %d. Row: %s", __LINE__, row);
   }
   if(counter != recordCount+1){
      fprintf(stderr, "Failed to read the correct number of records. Expected: %d, actual %d\n", recordCount, counter);
      fprintf(humanError, "Failed to read the correct number of records. Expected: %d, actual %d\n", recordCount, counter);
   }
   if(counter != personCounter + companyCounter){
      fprintf(humanError, "Failed to scan all rows. Scan failures: %d, difference between counts: %d\n", scanFails, counter-personCounter - companyCounter);
   }
   clock_t timeTaken = clock() - startTime;
   double secondsTaken = 1.0 * timeTaken / CLOCKS_PER_SEC;
   double averagePerThousand = secondsTaken / counter * 1000000;
   fprintf(humanError, "Read %d lines in %.3f sec. Average %.3f sec per 1,000,000 rows\n", counter, secondsTaken, averagePerThousand);
   fprintf(humanError, "%d company records, %d person records, %d unknown records, %d scan fails\n", companyCounter, personCounter, unknownCounter, scanFails);
   printf("%7d officers in %.3f seconds\n", personCounter, secondsTaken);
   fprintf(humanError, "\n\n\n%s%s%s%s%s\n\n\n",
           "-------------------------------------",
           "Finished converting ", inputFilename, " to CSV",
           "-------------------------------------");
   // free memory and close files
   fclose(filepointer);
   fclose(humanError);
   fclose(machineError);
   free(fileRow);
   Sleep(3000); // sleep 3 seconds to give files a chance to release permish
   return 0;
};
