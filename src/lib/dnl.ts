import { TICKERS } from '../data/tickers'
import { generateSpark } from './tickerMath'

// DNL is a genuine weighted-return composite of the other four symbols, the
// same construction used for real custom benchmarks: normalize each
// component to a return series, then combine by fixed weight. Caffeine gets
// the biggest share on purpose (see the "note" field on DNL).
export const DNL_WEIGHTS: Record<string, number> = {
  GAINZ: 0.25,
  CMIX: 0.15,
  CAFN: 0.35,
  CODE: 0.25,
}

export type LiveComponent = { changePct: number; spark: number[] }

export function computeDnl(liveCode: LiveComponent | null) {
  const components = TICKERS.filter(t => t.ticker in DNL_WEIGHTS)

  const seriesByTicker = components.map(t => {
    const isLiveCode = t.ticker === 'CODE' && liveCode !== null
    const changePct = isLiveCode ? liveCode!.changePct : t.changePct
    const spark = isLiveCode ? liveCode!.spark : generateSpark(t.ticker, t.changePct)
    const base = spark[0] || spark.find(v => v > 0) || 1
    const returns = spark.map(v => v / base - 1)
    return { weight: DNL_WEIGHTS[t.ticker], returns, changePct }
  })

  const length = Math.min(...seriesByTicker.map(s => s.returns.length))
  const combinedReturns: number[] = []
  for (let i = 0; i < length; i++) {
    let r = 0
    for (const s of seriesByTicker) r += s.weight * s.returns[i]
    combinedReturns.push(r)
  }

  const changePct = seriesByTicker.reduce((sum, s) => sum + s.weight * s.changePct, 0)
  return { changePct, combinedReturns }
}
