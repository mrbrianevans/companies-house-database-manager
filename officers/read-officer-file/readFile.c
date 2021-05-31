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
   char row[1000];
   FileRow* fileRow = NULL;
   if((fileRow = (FileRow *)malloc(sizeof(FileRow)))==NULL){
      printf("Failed to allocate memory to file row\n");
      exit(1);
   }
   fread(fileRow->companyNumber, 8, 1, filepointer);
   printf("Company number: %s. \n", fileRow->companyNumber);
   fseek(filepointer, 0, SEEK_SET);
   for (int i = 0; i < 10; ++i)
   {
      fgets(row, 1000, filepointer);
      strncpy_s(fileRow->companyNumber, 9, row, 8);
      fileRow->recordType = row[8];
      if(fileRow->recordType == '1'){
         printf("Company record for company number %s", fileRow->companyNumber);
      }else if(fileRow->recordType == '2'){
         fileRow->appDateOrigin = row[9];
         strncpy_s(fileRow->personNumber, 13, row + 12, 12);
         // can't get this to work, but it would be much better
         // (a single line to assign all values in struct)
         //sscanf(row, "*10%2c%12s", &fileRow->appointmentType, fileRow->personNumber);
         printf("Company number: %s. Record type: %c. App date origin: %c. App type: %c. Person number: %s\n", fileRow->companyNumber, fileRow->recordType, fileRow->appDateOrigin, fileRow->appointmentType, fileRow->personNumber);

      }else{
         fprintf(stderr, "Unexpected record type on line %d: %c\n", i, fileRow->recordType);
      }
   }
   printf("Closing file now\n");
   fclose(filepointer);
   return 0;
};
