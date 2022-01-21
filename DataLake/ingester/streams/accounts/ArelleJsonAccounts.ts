export interface ArelleJsonAccounts {
  factList:
    [
      "item",
      {
        "name": string
      },
      {
        "label": string,
        "value": string,
        "start"?: string,
        "endInstant": string,
        "dimensions"?: Record<string, string>
      }
    ][]
}


export interface ArelleDimensions {
  dimensions: LinkRole[]
}

export type Concept = ['concept', { name: string, label: string }, {
  "arcrole": "dimension-domain" | "domain-member",
  "usable": "false" | "true"
}, ...Concept[]]

type LinkRole = ['linkRole', { role: string, definition: string }, {}, ...Concept[]]

// sample object
const linkRole: LinkRole = [
  'linkRole',
  {
    role: 'asdf',
    definition: ''
  },
  {},
  [
    'concept',
    {
      "name": "countries:CountriesRegionsHeading",
      "label": "Countries and regions [heading]"
    },
    {
      "arcrole": "dimension-domain",
      "usable": "false"
    },
    [
      "concept",
      {
        "name": "countries:AllCountries",
        "label": "All countries"
      },
      {
        "arcrole": "domain-member",
        "usable": "true"
      }
    ]
  ]
]