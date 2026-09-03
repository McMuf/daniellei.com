import { useEffect, useMemo, useRef, useState } from 'react'
import { TICKERS, type TickerEntry } from '../data/tickers'
import { fetchGithubActivity, type GithubActivity } from '../lib/github'

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

// Smooths a jagged point series into a rounded curve (quadratic bezier
// through segment midpoints), the way modern finance-app charts render,
// rather than a sharp polyline.
function smoothPath(coords: { x: number; y: number }[]) {
  if (coords.length < 3) {
    return coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  }
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i]
    const p1 = coords[i + 1]
    const midX = (p0.x + p1.x) / 2
    const midY = (p0.y + p1.y) / 2
    d += ` Q${p0.x.toFixed(1)},${p0.y.toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`
  }
  const last = coords[coords.length - 1]
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`
  return d
}

function Chart({ points, up, id }: { points: number[]; up: boolean; id: string }) {
  const w = 320
  const h = 90
  const min = Math.min(...points)
  const range = Math.max(...points) - min || 1
  const coords = points.map((v, i) => ({
    x: (i / (points.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }))
  const linePath = smoothPath(coords)
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`
  const color = up ? 'var(--accent)' : '#eb5757'
  const gradId = `mt-grad-${id}`

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-chart" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  // loaded by the time someone clicks the CODE symbol.
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

  const displayPrice = isCode
    ? codeIsLive ? githubData!.pushesThisWeek : Math.round(price)
    : selected.isIndex
      ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2)

  const changeAmount = (price * (displayChangePct / 100))

  return (
    <div className="market-terminal">
      <div className="mt-titlebar">
        <span className="mt-dots"><i className="r" /><i className="y" /><i className="g" /></span>
        <span className="mt-titlebar-text">daniel@site:~ market.sh</span>
      </div>

      <div className="mt-app">
        <p className="mt-caption">made up stock performance indicator for my basic stats</p>

        <div className="mt-search">
          <span className="mt-caret">&gt;</span>
          <input
            ref={inputRef}
            className="mt-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="search a symbol: gainz, comic, code..."
            spellCheck={false}
          />
          <button type="button" className="mt-submit" onClick={submit} aria-label="Look up symbol">&gt;</button>
        </div>

        {notFound && (
          <p className="mt-notfound">not found: "{notFound}". try one of the symbols below.</p>
        )}

        <div className="mt-headrow">
          <span className="mt-chip">{selected.url
            ? <a href={selected.url} target="_blank" rel="noopener noreferrer">{selected.ticker}</a>
            : selected.ticker}
          </span>
          <span className="mt-headname">{selected.name}</span>
          {isCode && githubStatus === 'error' && <span className="mt-offline">offline, showing fallback</span>}
        </div>

        {isCode && githubStatus === 'loading' ? (
          <div className="mt-pricebig mt-price-loading">···</div>
        ) : (
          <>
            <div className="mt-pricebig">
              {displayPrice}<span className="mt-unit"> {selected.unit}</span>
            </div>
            <div className={`mt-changerow ${up ? 'up' : 'down'}`}>
              {up ? '+' : ''}{isCode ? '' : `${changeAmount.toFixed(2)} `}({up ? '+' : ''}{displayChangePct.toFixed(1)}%) {isCode ? 'this week' : 'today'}
            </div>
          </>
        )}

        <Chart points={displaySpark} up={up} id={selected.ticker} />

        <div className="mt-symbols">
          {TICKERS.map(t => (
            <button
              key={t.ticker}
              type="button"
              className={`mt-symbol${selected.ticker === t.ticker ? ' active' : ''}`}
              onClick={() => show(t)}
            >
              {t.ticker}
            </button>
          ))}
        </div>

        <div className="mt-detail">
          <span className="mt-detail-label">about</span>
          <p className="mt-detail-text">{selected.blurb}</p>
        </div>
        <div className="mt-detail">
          <span className="mt-detail-label">note</span>
          <p className="mt-detail-text">
            {isCode && githubStatus === 'loading' && 'loading live activity from GitHub...'}
            {isCode && codeIsLive && `${githubData!.pushesThisWeek} pushes to public repos in the last 7 days, pulled live from GitHub.`}
            {(!isCode || githubStatus === 'error') && selected.fact}
          </p>
        </div>
      </div>
    </div>
  )
}
