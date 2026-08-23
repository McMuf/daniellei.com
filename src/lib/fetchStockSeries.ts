// Fetches a recent daily close-price series for one symbol from Twelve Data
// (https://twelvedata.com) — a free-tier API that explicitly supports direct
// browser/CORS calls, so no backend proxy is required. Returns null (never
// throws) whenever a key isn't configured or the call fails for any reason,
// so callers can fall back to a synthetic line without special-casing errors.
type TwelveDataResponse = {
  status?: string
  values?: { close: string }[]
}

export async function fetchStockSeries(symbol: string): Promise<number[] | null> {
  const apiKey = import.meta.env.VITE_TWELVE_DATA_API_KEY
  if (!apiKey) return null

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return null

    const data = (await res.json()) as TwelveDataResponse
    if (data.status === 'error' || !data.values || data.values.length < 2) return null

    return data.values
      .map(v => parseFloat(v.close))
      .filter(n => Number.isFinite(n))
      .reverse()
  } catch {
    return null
  }
}
