export type Project = {
  title: string
  when: string // "year · role/context"
  summary: string
  bullets?: string[]
  stack?: string[]
  url?: string
  urlLabel?: string
  githubUrl?: string
  // Looping clip shown beside the description. Put the file in public/videos/
  // and reference it as '/videos/<name>.mp4'.
  video?: string
}

// most recent or most notable first
export const projects: Project[] = [
  {
    title: 'Spillover',
    when: '2026 · creator',
    summary: 'An open ledger that tests how news spills over into markets. Write down what you think a headline will do to a market, the claim gets frozen with a timestamp, and real market data grades it in public. Live in alpha since November 2026.',
    bullets: [
      'Guided seven-step claim form; event-study backtests over past events of the same kind with 95% intervals.',
      'Each forward prediction is written before its window closes, hashed, and anchored in Bitcoin with OpenTimestamps, so nobody can claim hindsight.',
      'Git is the database: scheduled GitHub Actions run the Python engine and commit results; the React site is static on GitHub Pages.',
      'Multiple-testing correction (Benjamini-Hochberg) and placebo controls; releases archived on Zenodo with a DOI.',
    ],
    stack: ['Python', 'Polars', 'DuckDB', 'statsmodels', 'React', 'TypeScript'],
    url: 'https://mcmuf.github.io/Spillover',
    urlLabel: 'live site',
    githubUrl: 'https://github.com/McMuf/Spillover',
    video: '/videos/spillover.mp4',
  },
  {
    title: 'Cospray',
    when: '2026 · Hack the North winner',
    summary: 'Multiplayer AR graffiti, r/place meets Pokémon GO: paint on real-world walls and the artwork stays there for everyone else. Won Best Mobile Experience Built with Expo; now heading toward a commercial launch with support from Expo and 50+ beta testers.',
    bullets: [
      'Expo / React Native app built around custom native AR modules in Swift (ARKit) and Kotlin (ARCore), fusing motion, magnetometer and GPS data with AR relocalization.',
      'AR world maps and stroke transforms persisted to Supabase Storage so artwork relocalizes on the same wall for other users.',
      'Location-based alerts and iOS / Android home-screen widgets.',
    ],
    stack: ['TypeScript', 'React Native', 'Expo', 'Swift', 'Kotlin', 'Supabase'],
    githubUrl: 'https://github.com/McMuf/htn26',
  },
  {
    title: 'OSS Pulse',
    when: '2026 · solo',
    summary: 'Does a company’s public GitHub activity say anything about its stock? A dashboard that scores open-source engineering health and backtests it against forward returns.',
    bullets: [
      'FastAPI backend and Next.js frontend computing a 6-metric OSS health score (commit velocity, contributor retention, release cadence) for public companies.',
      'Daily ingestion into DuckDB via scheduled GitHub Actions; lookahead-safe backtests, refocused on open-core companies and longer horizons after a 2026 SSRN study found no link for big tech.',
    ],
    stack: ['Python', 'FastAPI', 'DuckDB', 'Next.js', 'GitHub Actions'],
    url: 'https://oss-pulse-five.vercel.app/',
    urlLabel: 'live site',
    githubUrl: 'https://github.com/McMuf/OSS-Pulse',
  },
  {
    title: 'Ballify',
    when: '2026 · solo',
    summary: 'Tracks NBA players and teams like a stock exchange: stat tickers, sentiment analysis, live win probabilities and betting-style odds, pulling in Reddit sentiment and odds data.',
    stack: ['Python', 'FastAPI', 'Next.js', 'Vercel'],
    url: 'https://ballify-lovat.vercel.app',
    urlLabel: 'live site',
    githubUrl: 'https://github.com/McMuf/ballify-app',
  },
  {
    title: 'Markowitz Stock Optimizer',
    when: '2026 · solo',
    summary: 'Mean-variance portfolio optimizer built from scratch with a closed-form Lagrange-multiplier solution. Efficient frontier and max-Sharpe portfolio with Ledoit-Wolf shrinkage, backtested against naive and equal-weight allocations on an 8-asset universe.',
    stack: ['Python', 'NumPy', 'Pandas', 'SciPy'],
    githubUrl: 'https://github.com/McMuf/markowitzportoptimizer',
  },
  {
    title: 'Stock pitch portfolio',
    when: '2025 – 2026 · equity research',
    summary: 'Institutional-style research reports on AMAT, MU, FORM and others: overview, thesis, financials, catalysts and risks. For AMAT, a DCF supporting a $590 target, anchored on the AI wafer-fab-equipment supercycle.',
    stack: ['Excel', 'DCF', 'PowerPoint'],
  },
  {
    title: 'AsciiStarMine',
    when: '2026 · solo',
    summary: 'ASCII idle / adventure text game: a contract miner surviving quotas, factions and anomalous ore on an isolated rig. A generic engine driven entirely by data files, so new content never touches engine code.',
    stack: ['JavaScript', 'Vite'],
    url: 'https://asciistarmine.vercel.app',
    urlLabel: 'play',
    githubUrl: 'https://github.com/McMuf/asciistarmine',
  },
]
