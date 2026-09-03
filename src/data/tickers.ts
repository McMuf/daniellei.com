export type TickerEntry = {
  ticker: string
  name: string
  blurb: string
  fact: string
  basePrice: number
  changePct: number
}

// Illustrative/sample data, not live prices — see MarketTerminal's disclaimer.
// Blurbs and facts are written in plain language on purpose: this widget is
// meant to be approachable to someone with no finance or CS background.
export const TICKERS: TickerEntry[] = [
  {
    ticker: 'AAPL',
    name: 'Apple',
    blurb: 'Makes the iPhone, Mac, and AirPods.',
    fact: 'Worth well over $3 trillion — one of the most valuable companies on Earth.',
    basePrice: 232.50,
    changePct: 1.4,
  },
  {
    ticker: 'TSLA',
    name: 'Tesla',
    blurb: 'Builds electric cars and battery technology.',
    fact: "Founded by Elon Musk — its stock is famous for being a wild ride.",
    basePrice: 265.80,
    changePct: -2.1,
  },
  {
    ticker: 'NVDA',
    name: 'Nvidia',
    blurb: 'Makes the chips that power most AI and high-end gaming.',
    fact: 'Went from a gaming-graphics company to one of the most valuable companies on the planet, thanks to the AI boom.',
    basePrice: 178.20,
    changePct: 3.2,
  },
  {
    ticker: 'GOOGL',
    name: 'Google',
    blurb: 'Runs Google Search, YouTube, and Android.',
    fact: 'Handles billions of searches a day — probably including whatever brought you here.',
    basePrice: 196.40,
    changePct: 0.6,
  },
  {
    ticker: 'AMZN',
    name: 'Amazon',
    blurb: "Runs the world's biggest online store, plus AWS, the cloud servers behind huge chunks of the internet.",
    fact: 'A lot of the apps and websites you use every day are quietly running on Amazon\'s servers.',
    basePrice: 221.10,
    changePct: -0.4,
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    blurb: 'Makes Windows, Office, and the Xbox.',
    fact: 'One of only a handful of companies ever worth over $3 trillion.',
    basePrice: 468.90,
    changePct: 0.9,
  },
  {
    ticker: 'NFLX',
    name: 'Netflix',
    blurb: 'Streams movies and TV shows.',
    fact: 'Helped kill the DVD rental store — remember Blockbuster?',
    basePrice: 890.30,
    changePct: 1.8,
  },
  {
    ticker: 'NKE',
    name: 'Nike',
    blurb: 'Makes sneakers and sportswear.',
    fact: 'The swoosh logo is recognized almost everywhere on Earth.',
    basePrice: 78.40,
    changePct: -1.1,
  },
]
