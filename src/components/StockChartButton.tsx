import { useRef, useState } from 'react'
import { useSimulation } from './SimulationProvider'

const PREVIEW_POINTS = Array.from({ length: 14 }, (_, i) => {
  const x = (i / 13) * 160
  const y = 24 + Math.sin(i * 0.9) * 10 + (Math.random() - 0.5) * 6
  return `${x.toFixed(1)},${y.toFixed(1)}`
}).join(' ')

export default function StockChartButton() {
  const { spawn } = useSimulation()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [fired, setFired] = useState(false)

  const handleClick = () => {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (rect) spawn(rect.left + rect.width / 2, rect.top + rect.height / 2)
    setFired(true)
    window.setTimeout(() => setFired(false), 400)
  }

  return (
    <div className={`stock-sim${fired ? ' fired' : ''}`} ref={wrapRef}>
      <svg className="stock-sim-preview" viewBox="0 0 160 48" preserveAspectRatio="none">
        <polyline points={PREVIEW_POINTS} />
      </svg>
      <button className="stock-sim-button" onClick={handleClick}>
        ▸ run monte carlo simulation
      </button>
    </div>
  )
}
