// Deterministic per-ticker PRNG: same ticker string always produces the same
// sequence, so a given symbol's chart looks the same every time you look it
// up rather than re-randomizing on every render.
export function seededRandom(seedStr: string) {
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

// Discretized arithmetic Brownian motion with drift: v(t+1) = v(t) + mu + sigma*e(t),
// mu = changePct / N. This is the same model used to shape the historical chart.
export function generateSpark(ticker: string, changePct: number, points = 24) {
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
