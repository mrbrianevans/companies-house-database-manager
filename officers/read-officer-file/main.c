#include <stdio.h>
#include "main.h"

int main()
{
   char outputFilename[] = "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\third3.csv";
   FILE *outputPersonCsv;
   fopen_s(&outputPersonCsv, outputFilename, "w");
   clock_t startTime = clock();
   writePersonCsvHeaders(outputPersonCsv); // write CSV headers to the output file
   // readFile(
   //       "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_1_21042021010001.dat",
   //       outputPersonCsv);
   // readFile(
   //       "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_2_21042021010001.dat",
   //       outputPersonCsv);
   // readFile(
   //       "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_3_21042021010001.dat",
   //       outputPersonCsv);
   // readFile(
   //       "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_4_21042021010001.dat",
   //       outputPersonCsv);
   // readFile(
   //       "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_5_21042021010001.dat",
   //       outputPersonCsv);
   // readFile(
   //       "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_6_21042021010001.dat",
   //       outputPersonCsv);
   readFile(
         "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ew_7_21042021010001.dat",
         outputPersonCsv);
   readFile(
         "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_sc_21042021010001.dat",
         outputPersonCsv);
   readFile(
         "C:\\Users\\bme\\projects\\companies-house-database-manager\\samples\\officersdata\\officersApril2021\\Prod195_2898_ni_21042021010001.dat",
         outputPersonCsv);
   fclose(outputPersonCsv);

   clock_t timeTaken = clock() - startTime;
   double secondsTaken = 1.0 * timeTaken / CLOCKS_PER_SEC;
   printf("--------------------------------------------\n");
   printf("Finished in %.3f seconds\n\n", secondsTaken);
   printf("Output CSV saved @ %s\n", outputFilename);
   return 0;
}
