#include <stdio.h>
#include "readFile.h"

int main()
{
   printf("Hello, World!\n");
   printf("Reading a large file in C\n");
   readFile("../test_data.dat");
   return 0;
}
