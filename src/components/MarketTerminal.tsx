import { useEffect, useMemo, useRef, useState } from 'react'
import { TICKERS, type TickerEntry } from '../data/tickers'
import { fetchGithubActivity, type GithubActivity } from '../lib/github'

const QUICK_PICKS = ['GAINZ', 'CMIX', 'CAFN', 'CODE', 'DNL']
const GITHUB_USERNAME = 'McMuf'

function findTicker(query: string): TickerEntry | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return (
    TICKERS.find(t => t.ticker.toLowerCase() === q) ??
    TICKERS.find(t => t.name.toLowerCase().includes(q) || t.ticker.toLowerCase().includes(q))
  )
}

// Deterministic per-ticker "chart": same shape every time you look up the
// same ticker, trending in the direction of its changePct, so it reads as
// a real (if illustrative) daily chart rather than random noise.
function seededRandom(seedStr: string) {
  let h = 2166136261
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let seed = h >>> 0
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function generateSpark(ticker: string, changePct: number, points = 24) {
  const rand = seededRandom(ticker)
  const drift = changePct / points
  let v = 50
  const arr = [v]
  for (let i = 1; i < points; i++) {
    v += drift + (rand() - 0.5) * 4
    arr.push(v)
  }
  return arr
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  const w = 160
  const h = 40
  const min = Math.min(...points)
  const range = Math.max(...points) - min || 1
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mt-spark" aria-hidden="true">
      <path d={d} fill="none" stroke={up ? 'var(--accent)' : '#eb5757'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type GithubStatus = 'loading' | 'ready' | 'error'

export default function MarketTerminal() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<TickerEntry>(TICKERS[0])
  const [price, setPrice] = useState(TICKERS[0].basePrice)
  const [notFound, setNotFound] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [githubStatus, setGithubStatus] = useState<GithubStatus>('loading')
  const [githubData, setGithubData] = useState<GithubActivity | null>(null)

  // Fetched once on mount (not just when CODE is selected) so it's already
  // loaded by the time someone clicks the CODE chip.
  useEffect(() => {
    let cancelled = false
    fetchGithubActivity(GITHUB_USERNAME)
      .then(data => { if (!cancelled) { setGithubData(data); setGithubStatus('ready') } })
      .catch(() => { if (!cancelled) setGithubStatus('error') })
    return () => { cancelled = true }
  }, [])

  const isCode = selected.ticker === 'CODE'
  const codeIsLive = isCode && githubStatus === 'ready' && githubData !== null

  const spark = useMemo(() => generateSpark(selected.ticker, selected.changePct), [selected])
  const displaySpark = codeIsLive ? githubData!.spark : spark
  const displayChangePct = codeIsLive ? githubData!.changePct : selected.changePct
  const up = displayChangePct >= 0

  function show(entry: TickerEntry) {
    setSelected(entry)
    setPrice(entry.basePrice)
    setNotFound(null)
    setQuery('')
  }

  function submit() {
    const match = findTicker(query)
    if (match) show(match)
    else setNotFound(query.trim())
  }

  // Small live-ish jitter so the price feels like it's ticking, mean-reverting
  // back toward the base price so it never wanders off into unbelievable territory.
  useEffect(() => {
    const id = window.setInterval(() => {
      setPrice(p => {
        const reverted = p + (selected.basePrice - p) * 0.08
        return reverted + (Math.random() - 0.5) * selected.basePrice * 0.0012
      })
    }, 1800)
    return () => window.clearInterval(id)
  }, [selected])

  return (
    <div className="market-terminal">
      <p className="mt-hint">
        a tiny, completely made-up "market" tracking stats about me — type a symbol below (or click one), and hit enter
      </p>

      <div className="mt-prompt">
        <span className="mt-caret">&gt;</span>
        <input
          ref={inputRef}
          className="mt-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
          placeholder="try: gainz, comic, code…"
          spellCheck={false}
        />
      </div>

      <div className="mt-picks">
        {QUICK_PICKS.map(t => (
          <button key={t} type="button" className="tag" onClick={() => show(TICKERS.find(x => x.ticker === t)!)}>
            {t}
          </button>
        ))}
      </div>

      {notFound && (
        <p className="mt-notfound">don't have "{notFound}" — try one of the tickers above.</p>
      )}

      <div className="mt-card">
        <div className="mt-card-head">
          <span className="mt-ticker">
            {selected.url
              ? <a href={selected.url} target="_blank" rel="noopener noreferrer">{selected.ticker}</a>
              : selected.ticker}
          </span>
          <span className="mt-name">{selected.name}</span>
          {isCode && (
            <span className={`mt-live ${githubStatus}`}>
              {githubStatus === 'ready' && '● live'}
              {githubStatus === 'loading' && 'connecting…'}
              {githubStatus === 'error' && 'offline — showing fallback'}
            </span>
          )}
        </div>
        <div className="mt-price-row">
          {isCode && githubStatus === 'loading' ? (
            <span className="mt-price mt-price-loading">···</span>
          ) : (
            <>
              <span className="mt-price">
                {isCode
                  ? codeIsLive ? githubData!.pushesThisWeek : price.toFixed(0)
                  : selected.isIndex
                    ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : `$${price.toFixed(2)}`}
                {isCode && <span className="mt-pts"> pushes/wk</span>}
                {selected.isIndex && <span className="mt-pts"> pts</span>}
              </span>
              <span className={`mt-change ${up ? 'up' : 'down'}`}>
                {up ? '▲' : '▼'} {Math.abs(displayChangePct).toFixed(1)}% {isCode ? 'week/week' : 'today'}
              </span>
            </>
          )}
        </div>
        <Sparkline points={displaySpark} up={up} />
        <p className="mt-blurb">{selected.blurb}</p>
        <p className="mt-fact">
          {isCode && githubStatus === 'loading' && 'loading live activity from GitHub…'}
          {isCode && codeIsLive && `${githubData!.pushesThisWeek} pushes to public repos in the last 7 days — pulled live from GitHub.`}
          {(!isCode || githubStatus === 'error') && selected.fact}
        </p>
      </div>

      <p className="mt-disclaimer">completely made up — not a real market, just for fun</p>
    </div>
  )
}
