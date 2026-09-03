export type Project = {
  title: string
  description: string
  url?: string
  tags?: string[]
  year?: string
}

// most recent or most notable first
export const projects: Project[] = [
  {
    title: 'AsciiStarMine',
    description: 'ASCII idle/adventure text game. You\'re a contract miner for an interstellar extraction corporation, working an isolated rig, trying to survive quotas, factions, and whatever the anomalous ore actually is. Structure loosely follows A Dark Room: a generic engine (state manager, event scheduler, buttons, notifications) driven entirely by data files under content/, so new events/lore/factions never require touching engine code.',
    url: 'https://github.com/McMuf/asciistarmine',
    tags: ['JavaScript', 'HTML', 'CSS', 'Vite'],
    year: '2026',
  },
  {
    title: 'Ballify',
    description: 'Tracks NBA players and teams using a financial-market model — stat tickers, sentiment analysis, live win-probability calculations, and betting-style odds, gamifying basketball statistics like a stock exchange. FastAPI backend with a Next.js frontend, pulling in Reddit sentiment and betting-odds data.',
    url: 'https://github.com/McMuf/ballify-app',
    tags: ['Python', 'FastAPI', 'Next.js', 'Vercel'],
    year: '2026',
  },
  {
    title: 'Markowitz Stock Optimizer',
    description: 'Built Markowitz\'s mean-variance portfolio optimizer from scratch, deriving a closed-form solution via Lagrange multipliers rather than relying on solvers like scipy.optimize or PyPortfolioOpt. Constructed the efficient frontier and tangency (max-Sharpe) portfolio with Ledoit-Wolf covariance shrinkage, cross-validated against scipy.optimize, and backtested naive vs. shrinkage-adjusted vs. equal-weight allocations on an 8-asset universe.',
    url: 'https://github.com/McMuf/markowitzportoptimizer',
    tags: ['Python', 'NumPy', 'Pandas', 'SciPy'],
    year: '2026',
  },
  {
    title: 'Stock Pitch Portfolio: AMAT, MU, FORM & Others',
    description: 'Authored 4–6 institutional-style equity research reports, each structured with company overview, competitive positioning, investment thesis, financial analysis, catalysts, and risks. For AMAT: built a DCF model supporting a $590 price target, anchored on the AI WFE supercycle, 25-year-high gross margins (50%), and EPIC Center lock-in across TSMC, Samsung, Micron, and Broadcom.',
    tags: ['Excel', 'DCF', 'Equity Research', 'PowerPoint'],
    year: '2025 — 2026',
  },
]
