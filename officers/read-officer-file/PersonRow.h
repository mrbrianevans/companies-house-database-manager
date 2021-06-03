

#ifndef __PERSONROW_H
#define __PERSONROW_H
struct fileRow{
   char companyNumber[9];
   char recordType;
   char appDateOrigin;
   short int appointmentType;
   char personNumber[13];
   char corporateIndicator;
   char appointmentDate[9];
   char resignationDate[9];
   char personPostCode[9];
   char partialDateOfBirth[7];
   char fullDateOfBirth[9];
   // the length of the section of variable personal data
   int variableDataLength;
   //-----------VARIABLE DATA---------
   char *variableData; // length determined at runtime
   char title[51];
   char forenames[51];
   char surname[161];
   char honours[51];
   char careOf[101];
   char poBox[11];
   char addressLine1[252];
   char addressLine2[51];
   char postTown[51];
   char county[51];
   char country[51];
   char occupation[41];
   char nationality[41];
   char usualResidentialCountry[161];
};
typedef struct fileRow FileRow;
#endif //__PERSONROW_H
