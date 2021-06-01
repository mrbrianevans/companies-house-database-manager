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
   // file read successfully
   char headerRecord[21];
   // fread(headerRecord, 20, 1, filepointer);
   fgets(headerRecord, 21, filepointer);
   printf("Header record received: %s\n", headerRecord);
   char row[1000];
   FileRow* fileRow = NULL;
   if((fileRow = (FileRow *)malloc(sizeof(FileRow)))==NULL){
      printf("Failed to allocate memory to file row\n");
      return 1;
   }
   int counter = 0, companyCounter = 0, personCounter = 0, unknownCounter = 0, scanFails = 0;
   int variableDataLength;
   clock_t startTime = clock();
   for (char * hasNext = fgets(fileRow->companyNumber, 9, filepointer); hasNext;
   hasNext = fgets(fileRow->companyNumber, 9, filepointer))
   {
      counter++;
      // if(counter > 100) break;
      fileRow->recordType = fgetc(filepointer);

      if(fileRow->recordType == '1'){
         // printf("Company record for company number %s", fileRow->companyNumber);
         companyCounter++;
      }else if(fileRow->recordType == '2'){
         personCounter++;
         //app type is wrong. can't read a 2 digit number into a char, it seems?
         int scanned = fscanf(filepointer, "%1s%2c%12s", &fileRow->appDateOrigin, &fileRow->appointmentType, fileRow->personNumber);
         if(scanned != 3){
            scanFails++;
            // printf("Unexpected number of scanned arguments from string. Expected %d, actual %d", 3, scanned);
         }
         fileRow->corporateIndicator = fgetc(filepointer);
         scanned = fscanf(filepointer, "%*[ ]%8[0-9 ]%8[0-9 ]%8[0-9 A-Z]%8[0-9 ]%8[0-9 ]%4d", fileRow->appointmentDate, fileRow->resignationDate, fileRow->personPostCode, fileRow->partialDateOfBirth, fileRow->fullDateOfBirth, &variableDataLength);
         if(scanned != 6){
            scanFails++;
            // printf("Unexpected number of scanned arguments from string. Expected %d, actual %d", 6, scanned);
         }
         //todo: scan for variable data like "%[^<]%[^<]%[^<]%[^<]" to split by chevron
         if(personCounter < 3){
            printf("Company number: %s. Record type: %c. App date origin: %c. App type: %c. Person number: %s. ", fileRow->companyNumber, fileRow->recordType, fileRow->appDateOrigin, fileRow->appointmentType, fileRow->personNumber);
            // printf("Corporate indicator: %c. ", fileRow->corporateIndicator);
            if(fileRow->corporateIndicator == 'Y'){
               printf("IT IS A CORPORATION!");
            }
            printf("Appointment date: %s. ", fileRow->appointmentDate);
            printf("Resignation date: %s. ", fileRow->resignationDate);
            printf("Post code: %s. ", fileRow->personPostCode);
            printf("Partial birth date: %s. ", fileRow->partialDateOfBirth);
            printf("Full birth date: %s. ", fileRow->fullDateOfBirth);
            printf("\n");
         }
      }else{
         // fprintf(stderr, "Unexpected record type on line %d: %c\n%s\n", counter, fileRow->recordType, row);
         unknownCounter++;
      }
      fgets(row, 1000, filepointer);
   }
   clock_t timeTaken = clock() - startTime;
   double secondsTaken = 1.0 * timeTaken / CLOCKS_PER_SEC;
   double averagePerThousand = secondsTaken / counter * 1000000;
   printf("Closing file now. Read %d lines in %.3f sec. Average %.3f sec per 1,000,000 rows\n", counter, secondsTaken, averagePerThousand);
   printf("%d company records, %d person records, %d unknown records, %d scan fails\n", companyCounter, personCounter, unknownCounter, scanFails);
   fclose(filepointer);
   free(filepointer);
   free(fileRow);
   return 0;
};
