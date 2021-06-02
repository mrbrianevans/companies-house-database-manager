#include "readFile.h"

extern int readFile(char *filename){
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
if(counter>  5) break;
      if(fileRow->recordType == '1'){
         // printf("Company record for company number %s", fileRow->companyNumber);
         companyCounter++;
      }else if(fileRow->recordType == '2'){
         personCounter++;
         //app type is wrong. can't read a 2 digit number into a char, it seems?
         int scanned = fscanf(filepointer, "%1s%2s%12s", &fileRow->appDateOrigin, fileRow->appointmentType, fileRow->personNumber);
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
         //todo: this doesn't work due to %[ not accepting empty strings. Need to find another way
         //------ scan for variable data to split by chevron
         scanned = fscanf(filepointer, "%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]%[^<]",
                          fileRow->title, fileRow->forenames, fileRow->surname,
                          fileRow->honours, fileRow->careOf,fileRow->poBox,
                          fileRow->addressLine1,fileRow->addressLine2, fileRow->postTown,
                          fileRow->county, fileRow->country, fileRow->occupation,
                          fileRow->nationality, fileRow->usualResidentialCountry);
         if(scanned != 14){
            scanFails++;
            fseek(filepointer, beginningOfLinePos, SEEK_SET);
            fgets(row, 1000, filepointer);
            //todo: add this line to an error log file
            // continue;
            printf("Unexpected number of scanned arguments from string. Expected %d, actual %d: company number: %s\n", 14, scanned, fileRow->companyNumber);
         }
         if(personCounter < 3){
            printf("Company number: %s. Record type: %c. App date origin: %c. App type: %s. Person number: %s. ", fileRow->companyNumber, fileRow->recordType, fileRow->appDateOrigin, fileRow->appointmentType, fileRow->personNumber);
            // printf("Corporate indicator: %c. ", fileRow->corporateIndicator);
            if(fileRow->corporateIndicator == 'Y'){
               printf("IT IS A CORPORATION!");
            }
            printf("Appointment date: %s. ", fileRow->appointmentDate);
            printf("Resignation date: %s. ", fileRow->resignationDate);
            printf("Post code: %s. ", fileRow->personPostCode);
            printf("Partial birth date: %s. ", fileRow->partialDateOfBirth);
            printf("Full birth date: %s. ", fileRow->fullDateOfBirth);
            printf("\nFull name: %s %s %s %s. ", fileRow->title, fileRow->forenames, fileRow->surname, fileRow->honours);
            printf("\nFull address: %s, %s, %s, %s, %s, %s, %s. \n", fileRow->careOf, fileRow->poBox, fileRow->addressLine1, fileRow->addressLine2, fileRow->postTown, fileRow->county, fileRow->country);
            printf("Occupation & nationality, usual residential country: %s & %s, %s. ", fileRow->occupation, fileRow->nationality, fileRow->usualResidentialCountry);
            printf("\n");
         }
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
   printf("File %s closed\n", filename);
   free(filepointer);
   free(fileRow);
   return 0;
};
