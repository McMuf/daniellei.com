export type TickerEntry = {
  ticker: string
  name: string
  blurb: string
  fact: string
  basePrice: number
  changePct: number
  url?: string
  unit: string
  isIndex?: boolean
}

// Fully made up: a tiny "personal market" instead of real companies. Numbers,
// trends, and everything else here are just for fun, not real measurements.
export const TICKERS: TickerEntry[] = [
  {
    ticker: 'GAINZ',
    name: 'Gains Index',
    blurb: "a rough read on how consistent i've been in the gym lately.",
    fact: 'personally verified: creatine does, in fact, do something.',
    basePrice: 142.30,
    changePct: 2.6,
    unit: 'lbs',
  },
  {
    ticker: 'CMIX',
    name: 'Comic Index',
    blurb: 'tracks how deep into the comic backlog i am this year.',
    fact: 'current arc: rereading old Spider-Man runs when i should be studying.',
    basePrice: 34.60,
    changePct: -0.8,
    unit: 'issues',
  },
  {
    ticker: 'CAFN',
    name: 'Caffeine Index',
    blurb: "tracks how much coffee it's taking to keep this website running.",
    fact: 'correlates suspiciously well with commit frequency.',
    basePrice: 312.00,
    changePct: 4.1,
    unit: 'mg',
  },
  {
    ticker: 'CODE',
    name: 'GitHub Activity Index',
    blurb: 'real push activity across my public repos, this whole site included.',
    fact: "couldn't reach GitHub right now. click the ticker to see the real thing.",
    basePrice: 205.70,
    changePct: 1.9,
    unit: 'pushes/wk',
    url: 'https://github.com/McMuf',
  },
  {
    ticker: 'DNL',
    name: 'Daniel Composite Index',
    blurb: 'a blended index of everything above, basically the S&P 500 of me.',
    fact: "weighted more toward caffeine than i'd like to admit.",
    basePrice: 1284.60,
    changePct: 1.7,
    unit: 'pts',
    isIndex: true,
  },
]
