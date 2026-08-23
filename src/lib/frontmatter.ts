// Minimal frontmatter parser for our controlled post format (flat key: value
// pairs, optional [a, b, c] lists). Intentionally not a full YAML parser —
// avoids pulling in a Node-oriented library (e.g. gray-matter references
// Buffer, which doesn't exist in the browser bundle).
export function parseFrontmatter(raw: string): { data: Record<string, string | string[]>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: raw.trim() }

  const [, block, content] = match
  const data: Record<string, string | string[]> = {}

  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!m) continue
    const key = m[1]
    let raw = m[2].trim()
    if (/^".*"$/.test(raw)) raw = raw.slice(1, -1)

    if (raw.startsWith('[') && raw.endsWith(']')) {
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map(s => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
    } else {
      data[key] = raw
    }
  }

  return { data, content: content.trim() }
}
