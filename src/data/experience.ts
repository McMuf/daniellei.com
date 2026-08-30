export type Job = {
  company: string
  role: string
  url?: string
  period: string
  description?: string
  current?: boolean
}

// most recent first
export const jobs: Job[] = [
  {
    company: 'Marble Investments',
    role: 'Incoming Analyst',
    url: 'https://www.marbleinvestments.ca/',
    period: '2026',
    description: 'Incoming analyst at Marble Investments, a student-run investment fund at the University of Waterloo with ~$2M USD in assets under management.',
    current: true,
  },
  {
    company: 'UW Excel',
    role: 'Excel Tech & Finance Associate',
    period: '2026 — present',
    description: 'Build and maintain the website for UW Excel, an up-and-coming finance and technology club at the University of Waterloo; maintain and audit internal finance sheets, tracking budgets and expenditures for club operations.',
    current: true,
  },
  {
    company: 'vsHacks',
    role: 'Hackathon Chair',
    url: 'https://vshacks.com/',
    period: '2025 — present',
    description: 'Directed a student-run virtual hackathon across two editions, scaling to 400+ participants, 8+ sponsors, and $4,000+ CAD in prizes. Cold-emailed and recruited 6+ senior practitioners from J.P. Morgan, Apple, and Microsoft as judges and keynote speakers; negotiated cash and in-kind sponsorship across two funding cycles.',
    current: true,
  },
  {
    company: 'Conceptus Foundation',
    role: 'Co-Founder & President',
    url: 'https://conceptusfoundation.org/',
    period: 'Sep. 2024 — present',
    description: 'Founded and led a registered STEM-education nonprofit; managed 20+ volunteers and oversaw budgeting, fundraising, and donor communications. Fundraised $1,700+ CAD for STEM programming in underserved communities; grew Instagram to 1,000+ followers and 90,000+ impressions, and tutored Grades 4–7 students in Python fundamentals.',
    current: true,
  },
  {
    company: 'Soundr',
    role: 'President & Lead Developer',
    period: '2026',
    description: 'Co-founded a consumer health startup; served as president responsible for business strategy, financial record-keeping, and go-to-market execution. Generated $220 CAD in revenue within two weeks of launch, maintaining the company balance sheet and expense tracking throughout.',
  },
]
