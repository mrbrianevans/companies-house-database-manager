const min_uptime = '1m' // survive 1 minute for streams to count as "up"
const max_restarts = 3
module.exports = {
  "apps": [
    {
      "name": "load-companies",
      "script": "loaders/companies.js",
      min_uptime,
      max_restarts
    },
    {
      "name": "KeepAlive",
      "script": "./keepalive.js"
    }
  ]
}
