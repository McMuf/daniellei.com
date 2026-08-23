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
    title: 'Soundr Web App',
    description: 'Built and deployed the production web app for Soundr; as president, simultaneously managed P&L, tracked $220 CAD in early revenue, and maintained the company balance sheet.',
    tags: ['TypeScript', 'React', 'Tailwind CSS', 'Vercel'],
    year: '2026',
  },
  {
    title: 'Markowitz Stock Optimizer',
    description: 'Built Markowitz\'s mean-variance portfolio optimizer from scratch, deriving a closed-form solution via Lagrange multipliers rather than relying on solvers like scipy.optimize or PyPortfolioOpt. Constructed the efficient frontier and tangency (max-Sharpe) portfolio with Ledoit-Wolf covariance shrinkage, cross-validated against scipy.optimize, and backtested naive vs. shrinkage-adjusted vs. equal-weight allocations on an 8-asset universe.',
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
