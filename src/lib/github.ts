export type GithubActivity = {
  pushesThisWeek: number
  changePct: number
  spark: number[]
}

const WINDOW_DAYS = 21

type GithubEvent = {
  type: string
  created_at: string
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Real, public, unauthenticated data. GitHub's events API only covers the
// last ~90 days of *public* activity, so this undercounts private-repo work.
// As of the current API, PushEvent payloads no longer expose a commit count
// or list, so this counts pushes (not individual commits) per day, which is
// still a genuine, non-fake signal of how often I'm shipping code.
export async function fetchGithubActivity(username: string): Promise<GithubActivity> {
  const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`)
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
  const events = (await res.json()) as GithubEvent[]

  const counts = new Map<string, number>()
  const now = new Date()
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    counts.set(dayKey(d), 0)
  }

  for (const e of events) {
    if (e.type !== 'PushEvent') continue
    const key = dayKey(new Date(e.created_at))
    if (!counts.has(key)) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const spark = Array.from(counts.keys()).sort().map(k => counts.get(k) ?? 0)
  const last7 = spark.slice(-7).reduce((a, b) => a + b, 0)
  const prev7 = spark.slice(-14, -7).reduce((a, b) => a + b, 0)
  const changePct = prev7 === 0 ? (last7 > 0 ? 100 : 0) : ((last7 - prev7) / prev7) * 100

  return { pushesThisWeek: last7, changePct, spark }
}
