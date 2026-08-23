// A representative sample of S&P 500 constituents — not exhaustive, just enough
// variety for the homepage chart to pick a different name each load.
export const SP500_SAMPLE = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'JNJ', 'V',
  'PG', 'XOM', 'UNH', 'HD', 'MA', 'DIS', 'PYPL', 'BAC', 'ADBE', 'CRM',
  'NFLX', 'KO', 'PEP', 'CSCO', 'PFE', 'ABT', 'TMO', 'AVGO', 'COST', 'WMT',
  'MCD', 'NKE', 'INTC', 'VZ', 'CMCSA', 'ORCL', 'QCOM', 'TXN', 'HON', 'IBM',
]

export function randomTicker() {
  return SP500_SAMPLE[Math.floor(Math.random() * SP500_SAMPLE.length)]
}
