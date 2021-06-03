

#ifndef __WRITECSV_H
#define __WRITECSV_H

#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include "PersonRow.h"
// convert the number code (0-19) into an english word
char *getAppointmentType(int);
// write person headers with < deliminator to the file pointer
void writePersonCsvHeaders(FILE *);
void writePersonCsvLine(FILE * , FileRow * fileRow);
void printFileRow(FileRow);
#endif //__WRITECSV_H
