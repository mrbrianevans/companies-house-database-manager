

#ifndef __DATABASE_H
#define __DATABASE_H

#include <stdio.h>
#include <stdlib.h>
#include "libpq-fe.h"

static void
exit_nicely(PGconn *conn);
extern int query();
#endif //__DATABASE_H
