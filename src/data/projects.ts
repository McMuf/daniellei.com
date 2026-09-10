export type Project = {
  title: string
  description: string
  url?: string
  githubUrl?: string
  tags?: string[]
  year?: string
}

// most recent or most notable first
export const projects: Project[] = [
  {
    title: 'OSS Pulse',
    description: 'Tests whether a company\'s public GitHub activity (commit velocity, contributor retention, release cadence) signals engineering health, replicating a 2026 SSRN study that found no such link at big tech firms. Ingests GitHub and stock data into a scored, backtested dashboard. Not investment advice.',
    url: 'https://oss-pulse-five.vercel.app/',
    githubUrl: 'https://github.com/McMuf/OSS-Pulse',
    tags: ['Python', 'FastAPI', 'Next.js', 'TypeScript'],
    year: '2026',
  },
  {
    title: 'Ballify',
    description: 'Tracks NBA players and teams like a stock exchange: stat tickers, sentiment analysis, live win probabilities, and betting-style odds. FastAPI backend, Next.js frontend, pulling in Reddit sentiment and betting-odds data.',
    url: 'https://ballify-lovat.vercel.app',
    githubUrl: 'https://github.com/McMuf/ballify-app',
    tags: ['Python', 'FastAPI', 'Next.js', 'Vercel'],
    year: '2026',
  },
  {
    title: 'Markowitz Stock Optimizer',
    description: 'Markowitz mean-variance portfolio optimizer built from scratch with a closed-form Lagrange-multiplier solution. Constructs the efficient frontier and max-Sharpe portfolio with Ledoit-Wolf shrinkage, backtested against naive and equal-weight allocations on an 8-asset universe.',
    url: 'https://github.com/McMuf/markowitzportoptimizer',
    tags: ['Python', 'NumPy', 'Pandas', 'SciPy'],
    year: '2026',
  },
  {
    title: 'Stock Pitch Portfolio: AMAT, MU, FORM & Others',
    description: '4-6 institutional-style equity research reports covering company overview, thesis, financials, catalysts, and risks. For AMAT: a DCF model supporting a $590 target, anchored on the AI WFE supercycle and EPIC Center lock-in across TSMC, Samsung, Micron, and Broadcom.',
    tags: ['Excel', 'DCF', 'Equity Research', 'PowerPoint'],
    year: '2025 — 2026',
  },
  {
    title: 'AsciiStarMine',
    description: 'ASCII idle/adventure text game: a contract miner surviving quotas, factions, and anomalous ore on an isolated rig. Loosely follows A Dark Room, a generic engine driven entirely by data files so new content never touches engine code.',
    url: 'https://asciistarmine.vercel.app',
    githubUrl: 'https://github.com/McMuf/asciistarmine',
    tags: ['JavaScript', 'HTML', 'CSS', 'Vite'],
    year: '2026',
  },
]
