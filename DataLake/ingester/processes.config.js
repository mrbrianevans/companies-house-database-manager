const min_uptime = '1m' // survive 1 minute for streams to count as "up"
const max_restarts = 3
module.exports = {
  "apps": [
    {
      "name": "filing-stream",
      "script": "streams/filing.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "charges-stream",
      "script": "streams/charges.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "companies-stream",
      "script": "streams/companies.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "psc-stream",
      "script": "streams/psc.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "officers-stream",
      "script": "streams/officers.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "insolvencies-stream",
      "script": "streams/insolvencies.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "backport-accounts",
      "script": "streams/accounts/backportAccountsFromPostgres.js",
      "autorestart": false,
    },
    {
      "name": "missing-filing-events",
      "script": "streams/getMissingFilingEvents.js",
      max_restarts
    },
    // {
    //   "name": "bulk-load-companies-basic",
    //   "script": "/BulkLoadScripts/companies.sh",
    //   "interpreter": "/bin/bash",
    //   "autorestart": false,
    //   "cron_restart": "00 00 5 * *"
    // },
    // {
    //   "name": "bulk-load-psc",
    //   "script": "/BulkLoadScripts/psc.sh",
    //   "interpreter": "/bin/bash",
    //   "autorestart": false,
    //   "cron_restart": "00 10 * * *"
    // },
    // {
    //   "name": "bulk-load-postcodes",
    //   "script": "/BulkLoadScripts/postcodes.sh",
    //   "interpreter": "/bin/bash",
    //   "autorestart": false,
    //   "cron_restart": "00 00 1 1 *"
    // },
    // {
    //   "name": "bulk-load-sic-codes",
    //   "script": "/BulkLoadScripts/sic.sh",
    //   "interpreter": "/bin/bash",
    //   "autorestart": false
    // },
    // {
    //   "name": "bulk-load-officers",
    //   "script": "/BulkLoadScripts/officers.sh",
    //   "interpreter": "/bin/bash",
    //   "autorestart": false,
    // },
    {
      "name": "KeepAlive",
      "script": "./keepalive.js"
    }
  ]
}
