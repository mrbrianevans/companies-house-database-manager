

#include "database.h"
static void
exit_nicely(PGconn *conn)
{
   PQfinish(conn);
   exit(1);
}

extern int query()
{
   const char *conninfo;
   PGconn     *conn;
   PGresult   *res;
   int         nFields;
   int         i,j;

   /*
    * If the user supplies a parameter on the command line, use it as the
    * conninfo string; otherwise default to setting dbname=postgres and using
    * environment variables or defaults for all other connection parameters.
    */
   conninfo = "password = postgres";

   /* Make a connection to the database */
   conn = PQconnectdb(conninfo);

   /* Check to see that the backend connection was successfully made */
   if (PQstatus(conn) != CONNECTION_OK)
   {
      fprintf(stderr, "Connection to database failed: %s",
              PQerrorMessage(conn));
      exit_nicely(conn);
   }

   /* Set always-secure search path, so malicious users can't take control. */
   res = PQexec(conn,
                "SELECT pg_catalog.set_config('search_path', '', false)");
   if (PQresultStatus(res) != PGRES_TUPLES_OK)
   {
      fprintf(stderr, "SET failed: %s", PQerrorMessage(conn));
      PQclear(res);
      exit_nicely(conn);
   }

   /*
    * Should PQclear PGresult whenever it is no longer needed to avoid memory
    * leaks
    */
   PQclear(res);

   res = PQexec(conn, "SELECT NOW();");
   if (PQresultStatus(res) != PGRES_COMMAND_OK)
   {
      fprintf(stderr, "SELECT NOW() command failed: %s", PQerrorMessage(conn));
      PQclear(res);
      exit_nicely(conn);
   }
   /* first, print out the attribute names */
   nFields = PQnfields(res);
   for (i = 0; i < nFields; i++)
      printf("%-15s", PQfname(res, i));
   printf("\n\n");

   /* next, print out the rows */
   for (i = 0; i < PQntuples(res); i++)
   {
      for (j = 0; j < nFields; j++)
         printf("%-15s", PQgetvalue(res, i, j));
      printf("\n");
   }

   PQclear(res);

   /* close the connection to the database and cleanup */
   PQfinish(conn);

   return 0;
}