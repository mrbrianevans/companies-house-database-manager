// from https://github.com/mrbrianevans/companies-house-frontend/blob/a44332b7d4427b7c57490ecb3893e9551cf87bb2/helpers/companiesHouseRateLimit.ts
export const getCompaniesHouseRateLimit = (headers: {}) => {
  const values: RateLimitHeaders = {limit: 0, remain: 0, window: '', reset: 0}
  for (const [header, value] of Object.entries(headers)) {
    if (header.startsWith('x-ratelimit-')) {
      // @ts-ignore
      const [, label]: [any, keyof RateLimitHeaders] = header.match(/^x-ratelimit-([a-z-]+)$/)
      if (label === 'limit' || label === 'remain' || label === 'reset') values[label] = Number(value)
      else if (label === 'window') values[label] = String(value)
    }
  }
  return values
}


// from https://github.com/mrbrianevans/companies-house-frontend/blob/a44332b7d4427b7c57490ecb3893e9551cf87bb2/types/ApiRateLimitHeaders.ts
// rate limiting info from companies house
export interface RateLimitHeaders {
  limit: number
  remain: number
  // number of seconds since epoch when the rate limit will reset
  reset: number
  window: string
}

