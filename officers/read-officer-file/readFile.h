
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef __READFILE_H
#define __READFILE_H
struct fileRow{
   char companyNumber[9];
   char recordType;
   char appDateOrigin;
   char appointmentType;
   char personNumber[13];
   char corporateIndicator;
   char appointmentDate[9];
   char resignationDate[9];
   char personPostCode[9];
   char partialDateOfBirth[7];
   char fullDateOfBirth[9];
   // the length of the section of variable personal data
   char variableDataLength;

};
typedef struct fileRow FileRow;
extern int readFile();
#endif //__READFILE_H
