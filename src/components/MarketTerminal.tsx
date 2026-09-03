import { useEffect, useMemo, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { TICKERS, type TickerEntry } from '../data/tickers'
import { fetchGithubActivity, type GithubActivity } from '../lib/github'
import { generateSpark } from '../lib/tickerMath'
import { computeDnl, DNL_WEIGHTS } from '../lib/dnl'

const GITHUB_USERNAME = 'McMuf'

function findTicker(query: string): TickerEntry | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return (
    TICKERS.find(t => t.ticker.toLowerCase() === q) ??
    TICKERS.find(t => t.name.toLowerCase().includes(q) || t.ticker.toLowerCase().includes(q))
  )
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

function Eq({ tex }: { tex: string }) {
  const html = useMemo(() => katex.renderToString(tex, { throwOnError: false, displayMode: true }), [tex])
  return <div className="mt-eq" dangerouslySetInnerHTML={{ __html: html }} />
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
  const isDnl = selected.ticker === 'DNL'
  const codeIsLive = isCode && githubStatus === 'ready' && githubData !== null
  const liveCodeForDnl = githubStatus === 'ready' && githubData !== null
    ? { changePct: githubData.changePct, spark: githubData.spark }
    : null

  const spark = useMemo(() => generateSpark(selected.ticker, selected.changePct), [selected])
  const dnl = useMemo(() => (isDnl ? computeDnl(liveCodeForDnl) : null), [isDnl, liveCodeForDnl])

  const displaySpark = isDnl
    ? dnl!.combinedReturns.map(r => selected.basePrice * (1 + r))
    : codeIsLive ? githubData!.spark : spark
  const displayChangePct = isDnl ? dnl!.changePct : codeIsLive ? githubData!.changePct : selected.changePct
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

  // Small live-ish jitter so the price feels like it's ticking: a discretized
  // Ornstein-Uhlenbeck process (mean-reverting toward the base value), the
  // same style of model used for things like the Vasicek interest-rate model.
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
        <p className="mt-caption">stock performance indicator for my basic stats</p>

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

        <details className="mt-math">
          <summary>how is this calculated?</summary>

          <p className="mt-math-p">
            GAINZ, CMIX, and CAFN are generated by a seeded random walk (GAINZ starts from my actual bodyweight,
            163 lbs). Each step is a discretized <strong>arithmetic Brownian motion with drift</strong>, the same
            model used for a security's expected-return path in the Black-Scholes framework:
          </p>
          <Eq tex="v_{t+1} = v_t + \mu + \sigma \, \varepsilon_t, \qquad \mu = \frac{\Delta\%}{N}, \qquad \varepsilon_t \sim U(-\tfrac{1}{2}, \tfrac{1}{2})" />

          <p className="mt-math-p">
            The live tick you see every couple seconds is a separate, faster process: a discretized{' '}
            <strong>Ornstein-Uhlenbeck</strong> mean-reverting walk, the same family of model used for the
            Vasicek interest-rate model, pulling the price back toward its base value:
          </p>
          <Eq tex="P_{t+1} = P_t + \kappa(\theta - P_t) + \sigma_P \, \varepsilon_t" />
          <p className="mt-math-p mt-math-legend">
            &kappa; = mean-reversion speed, &theta; = base value, &sigma; = noise scale.
          </p>

          <p className="mt-math-p">
            CODE is not simulated at all, it is pulled live from the GitHub events API.
          </p>

          <p className="mt-math-p">
            DNL is a genuine <strong>weighted-return composite index</strong>, built the same way a custom
            benchmark is constructed in practice: normalize each symbol to a return series relative to its own
            starting value, then combine by fixed weight.
          </p>
          <Eq tex="R_{i,t} = \frac{P_{i,t}}{P_{i,0}} - 1" />
          <Eq tex="R_{DNL,t} = \sum_{i} w_i \, R_{i,t}" />
          <Eq tex="DNL_t = DNL_0 \,(1 + R_{DNL,t})" />

          <table className="mt-weights">
            <thead>
              <tr><th>symbol</th><th>weight</th></tr>
            </thead>
            <tbody>
              {Object.entries(DNL_WEIGHTS).map(([ticker, w]) => (
                <tr key={ticker}>
                  <td>{ticker}</td>
                  <td>{(w * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  )
}
