export type Job = {
  company: string
  role: string
  url?: string
  period: string
  summary?: string
  bullets?: string[]
}

// most recent first
export const jobs: Job[] = [
  {
    company: 'Marble Investments',
    role: 'software engineer',
    url: 'https://www.marbleinvestments.ca/',
    period: 'Sep 2026 – present',
    summary: 'Building research tooling for a $2M USD investment fund.',
    bullets: [
      'Built a Python screening tool that ingests public company-activity data to map second-order supply-chain impacts, surfacing signals behind the equity research team’s stock recommendations that generated $15,000+ in alpha.',
      'Developed a news-intelligence pipeline for the fund’s Nodal Research coverage universe (AI Buildout, AI Applications, Areas of Interest), parsing the latest news into per-ticker views and a universe-wide feed of impacted tickers.',
      'Designed an LLM-based layer that flags relevant industry and non-ticker news and explains its impact on covered companies.',
    ],
  },
  {
    company: '@dandoesdev_',
    role: 'content creator',
    url: 'https://www.instagram.com/dandoesdev_/',
    period: 'Aug 2026 – present',
    summary: 'A content account documenting my CS + Finance journey, with a fitness and humour twist.',
    bullets: [
      '1M+ organic views and 2 affiliate sponsorship deals.',
    ],
  },
  {
    company: 'UW Excel',
    role: 'tech & finance associate',
    period: '2026 – present',
    summary: 'Maintain and audit budget and expenditure tracking for a finance and technology club at the University of Waterloo, and support its technical infrastructure.',
  },
  {
    company: 'vsHacks',
    role: 'hackathon chair',
    url: 'https://vshacks.com/',
    period: '2025 – present',
    summary: 'Directed a student-run virtual hackathon across two editions with 400+ participants and $7,000+ CAD in prizes, managing budget and sponsors.',
    bullets: [
      'Recruited senior practitioners from J.P. Morgan, Apple and Microsoft as judges and keynote speakers.',
    ],
  },
  {
    company: 'Conceptus Foundation',
    role: 'co-founder & president',
    url: 'https://conceptusfoundation.org/',
    period: 'Sep 2024 – present',
    summary: 'Founded and led a registered STEM-education nonprofit of 20+ volunteers.',
    bullets: [
      'Fundraised $1,700+ CAD for programming in underserved communities and grew online reach to 90,000+ people.',
      'Tutored Grades 4–7 students in Python fundamentals and scripted “Minute Masterclass,” a short-form STEM video series.',
    ],
  },
  {
    company: 'Soundr',
    role: 'president & lead developer',
    period: '2026',
    summary: 'Co-founded a consumer health startup; ran business strategy, bookkeeping and go-to-market. $220 CAD in revenue within two weeks of launch.',
  },
]

export type Program = {
  org: string
  role: string
  url?: string
  period: string
  summary: string
}

export const programs: Program[] = [
  {
    org: 'Susquehanna International Group (SIG)',
    role: 'Virtual Discovery Program',
    url: 'https://sig.com/',
    period: '2026',
    summary: 'Selected from hundreds of applicants to explore quantitative trading, market making, and game-theory decision science.',
  },
]
