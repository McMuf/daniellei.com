import { useEffect, useRef, useState } from 'react'
import { useSimulation } from './SimulationProvider'
import { fetchStockSeries } from '../lib/fetchStockSeries'
import { randomTicker } from '../lib/stockTickers'

function syntheticSeries() {
  return Array.from({ length: 20 }, (_, i) => 24 + Math.sin(i * 0.9) * 10 + (Math.random() - 0.5) * 6)
}

function seriesToPoints(series: number[], width: number, height: number) {
  const min = Math.min(...series)
  const max = Math.max(...series)
  const range = max - min || 1
  return series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 6) - 3
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function StockChartButton() {
  const { spawn } = useSimulation()
  const wrapRef = useRef<HTMLButtonElement>(null)
  const [fired, setFired] = useState(false)
  const [points, setPoints] = useState(() => seriesToPoints(syntheticSeries(), 160, 48))
  const [ticker, setTicker] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const symbol = randomTicker()
    fetchStockSeries(symbol).then(series => {
      if (cancelled || !series) return
      setPoints(seriesToPoints(series, 160, 48))
      setTicker(symbol)
    })
    return () => { cancelled = true }
  }, [])

  const handleClick = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) spawn(rect.left + rect.width / 2, rect.top + rect.height / 2)
    setFired(true)
    window.setTimeout(() => setFired(false), 400)
  }

  return (
    <button
      className={`stock-sim${fired ? ' fired' : ''}`}
      ref={wrapRef}
      onClick={handleClick}
      aria-label="Run a market simulation from this chart"
    >
      <svg className="stock-sim-preview" viewBox="0 0 160 48" preserveAspectRatio="none">
        <polyline points={points} />
      </svg>
      <span className="stock-sim-caption">
        {ticker ? `${ticker} · click to simulate` : 'click to simulate'}
      </span>
    </button>
  )
}
