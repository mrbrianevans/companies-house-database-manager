#include "writeCsv.h"

char * getAppointmentType(int typeCode){
   switch ( typeCode )
   {
      case 0:
         return "Secretary";
      case 1:
         return "Director";
      case 4:
         return "Non-designated LLP Member";
      case 5:
         return "Designated LLP Member";
      case 11:
         return "Judicial Factor";
      case 12:
         return "Receiver or Manager appointed under the Charities Act";
      case 13:
         return "Manager appointed under the CAICE Act";
      case 17:
         return "SE Member of Administrative Organ";
      case 18:
         return "SE Member of Supervisory Organ";
      case 19:
         return "SE Member of Management Organ";
      default:
         return "";
   }
}

// formats a date from CCYYMMDD to YYYY-MM-DD (actually just leaving it for now)
char * formatFullDate(char * unformattedDate){
   if(unformattedDate[0] == ' ') return "";
   // this corrects data entry faults that have 0006 for 2006
   if(unformattedDate[0] == '0' && unformattedDate[1] == '0')
      unformattedDate[0] = '2';
   return unformattedDate;
}

// formats a date from CCYYMM to CCYYMM01
char * formatPartialDate(char * unformattedDate){
   if(unformattedDate[0] == ' ') return "";
   unformattedDate[6] = '0';
   unformattedDate[7] = '1';
   unformattedDate[8] = '\0';
   return unformattedDate; // make it the first of the month
}

void writePersonCsvHeaders(FILE* filepointer)
{
   fprintf(filepointer, "company_number<appointment_type<person_number<is_corporate_body<appointment_date<resignation_date<post_code<birth_date<birth_date_is_accurate<title<forenames<surname<honours<care_of<po_box<address_line_1<address_line_2<post_town<county<country<occupation<nationality<usual_residential_country\n");
}


void writePersonCsvLine(FILE* filepointer, FileRow * fileRow)
{
   // these cap the last character off the variable data. if its a <, this is good
   // fileRow->variableData[fileRow->variableDataLength-1] = '\0';
   // fileRow->variableData[strlen(fileRow->variableData)-1] = '\0';
   fprintf(filepointer, "%8s<%s<%12s<%s<%s<%s<%s<%s<%s<%s\n",
           fileRow->companyNumber,
           getAppointmentType(fileRow->appointmentType),
           fileRow->personNumber,
           fileRow->corporateIndicator == 'Y' ? "true" : "false",
           formatFullDate(fileRow->appointmentDate),
           fileRow->resignationDate[0] == ' ' ? "": formatFullDate(fileRow->resignationDate),
           // post code needs to check for equals space and then return null
           fileRow->personPostCode[0] == ' ' ? "": fileRow->personPostCode,
           // fileRow->personPostCode,
           // birth date is not working
           fileRow->fullDateOfBirth[0] != ' ' ? formatFullDate(fileRow->fullDateOfBirth) :formatPartialDate(fileRow->partialDateOfBirth),
           fileRow->fullDateOfBirth[0] != ' ' ? "true" : "false",
           fileRow->variableData
        );
}


