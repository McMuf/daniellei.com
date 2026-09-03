import { useMemo } from 'react'

// Purely decorative, home-page-only background layer: a faint stock-chart
// motif behind the bio/ascii-ship/latest-report content. Candle
// open/close values are generated as a random walk (not independent random
// heights) so the row actually reads as a price series rather than a
// scatter of boxes.

const COUNT = 34
const BAND_HEIGHT = 340

type Candle = {
  bodyTop: number
  bodyHeight: number
  wickTop: number
  wickHeight: number
  up: boolean
  delay: number
  duration: number
}

function generateCandles(): Candle[] {
  let price = 50
  const raw: { open: number; close: number; high: number; low: number }[] = []

  for (let i = 0; i < COUNT; i++) {
    const open = price
    const close = open + (Math.random() - 0.5) * 16
    const high = Math.max(open, close) + Math.random() * 6
    const low = Math.min(open, close) - Math.random() * 6
    raw.push({ open, close, high, low })
    price = close
  }

  const values = raw.flatMap(c => [c.high, c.low])
  const min = Math.min(...values)
  const range = Math.max(...values) - min || 1
  const toPx = (v: number) => ((v - min) / range) * BAND_HEIGHT

  return raw.map(c => {
    const bodyTop = BAND_HEIGHT - toPx(Math.max(c.open, c.close))
    const bodyBottom = BAND_HEIGHT - toPx(Math.min(c.open, c.close))
    const wickTop = BAND_HEIGHT - toPx(c.high)
    const wickBottom = BAND_HEIGHT - toPx(c.low)

    return {
      bodyTop,
      bodyHeight: Math.max(4, bodyBottom - bodyTop),
      wickTop,
      wickHeight: Math.max(1, wickBottom - wickTop),
      up: c.close >= c.open,
      delay: -(Math.random() * 6),
      duration: 3 + Math.random() * 2.5,
    }
  })
}

export default function CandlestickBackground() {
  const candles = useMemo(generateCandles, [])

  return (
    <div className="candle-bg" aria-hidden="true">
      {candles.map((c, i) => (
        <span
          key={i}
          className={`candle ${c.up ? 'candle-up' : 'candle-down'}`}
          style={{ animationDelay: `${c.delay}s`, animationDuration: `${c.duration}s` }}
        >
          <span className="candle-wick" style={{ top: c.wickTop, height: c.wickHeight }} />
          <span className="candle-body" style={{ top: c.bodyTop, height: c.bodyHeight }} />
        </span>
      ))}
    </div>
  )
}
