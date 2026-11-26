import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Ambient ASCII Pikachu for the home page.
//
// /pikachu.png is drawn each frame onto a tiny offscreen canvas with one pixel
// per text cell (squashed / stretched / tilted for the bounce), read back, and
// printed as monospace glyphs picked by luminance in the image's own colors.
// He sits in the bottom-right corner and hops happily: three bouncy hops, a
// short rest where his cheeks crackle, repeat. Now and then a bolt fires from
// his cheeks across the page.

type V = { x: number; y: number }
type RGB = [number, number, number]
type Cell = { cx: number; cy: number; ch: string; r: number; g: number; b: number; a: number }
type Bolt = { id: number; paths: V[][]; born: number; life: number; strong: boolean }

const SRC = '/pikachu.png'
const RAMP = ' .:-=+*#%@'
const STATIC = '!<>/\\[]{}=+*^~?#01'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const YEL: RGB = [255, 217, 59]
const YEL_HI: RGB = [255, 242, 122]
const WHITE_Y: RGB = [255, 250, 214]

// cheek centers in normalized image coords
const CHEEKS: V[] = [{ x: 0.206, y: 0.411 }, { x: 0.525, y: 0.51 }]

// bounce cycle: three hops, then a rest
const HOP = 0.5
const HOPS = 3
const REST = 1.5
const CYCLE = HOP * HOPS + REST
const INTRO = 0.9

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
function hash(x: number, y: number, z = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const pick = (s: string, r: number) => s[Math.floor(r * s.length) % s.length]
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// height (0..1), squash/stretch and sway for time t in the cycle
function bounce(t: number) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE
  if (c < HOP * HOPS) {
    const n = Math.floor(c / HOP)
    const p = (c - n * HOP) / HOP
    const h = Math.sin(p * Math.PI) * (n === HOPS - 1 ? 1.25 : 1) // last hop is the big one
    const edge = Math.min(p, 1 - p)
    const squash = edge < 0.14 ? 1 - 0.14 * (1 - edge / 0.14) : 1 + 0.05 * h
    const sway = (n % 2 ? 1 : -1) * 0.06 * Math.sin(p * Math.PI)
    return { h, sy: squash, sx: 1 / Math.sqrt(squash), sway, resting: false, rest: 0 }
  }
  const r = (c - HOP * HOPS) / REST
  // settle wobble, then breathe, then a little anticipation crouch before hopping again
  const settle = Math.exp(-r * 9) * Math.sin(r * 40) * 0.05
  const crouch = r > 0.85 ? -0.12 * Math.sin(((r - 0.85) / 0.15) * Math.PI * 0.5) : 0
  const sy = 1 + settle + crouch + 0.015 * Math.sin(r * 12)
  return { h: 0, sy, sx: 1 / Math.sqrt(sy), sway: 0, resting: true, rest: r }
}

export default function AsciiPikachu() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const off = document.createElement('canvas')
    const octx = off.getContext('2d', { willReadFrequently: true })
    if (!ctx || !octx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const params = new URLSearchParams(window.location.search)
    const debugT = params.has('pika_t') ? Number(params.get('pika_t')) : null
    const rng = mulberry32(debugT !== null ? 7 : (Date.now() & 0xffffffff))

    let W = 0, H = 0, cw = 3, chH = 5, fs = 4.6, cols = 0, rows = 0
    let bfs = 9, bcw = 5.4, bch = 9.7 // lightning glyph grid
    let wPx = 200, hPx = 210, hopPx = 30, footX = 0, groundY = 0
    const img = new Image()
    let aspect = 1191 / 1254

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(H * dpr)
      canvas!.style.width = `${W}px`
      canvas!.style.height = `${H}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const mobile = W < 640
      fs = mobile ? 4 : 4.6
      ctx!.font = `${fs}px ${MONO}`
      cw = Math.max(2.2, ctx!.measureText('M').width)
      chH = Math.round(fs * 1.08 * 10) / 10
      bfs = mobile ? 7 : 9
      ctx!.font = `${bfs}px ${MONO}`
      bcw = ctx!.measureText('M').width
      bch = Math.round(bfs * 1.08 * 10) / 10
      cols = Math.ceil(W / cw)
      rows = Math.ceil(H / chH)
      off.width = cols
      off.height = rows
      hPx = mobile ? clamp(H * 0.22, 130, 180) : clamp(H * 0.34, 200, 320)
      wPx = hPx * aspect
      hopPx = hPx * 0.16
      footX = W - wPx * 0.55 - 24 // pivot sits between his feet
      groundY = H - 10
    }

    // ---- frame transform: image coords (0..1) -> screen px ----
    let pose = bounce(0)
    let pivot: V = { x: 0, y: 0 }
    function toS(u: number, v: number): V {
      const x = (u - 0.45) * wPx * pose.sx
      const y = (v - 1) * hPx * pose.sy
      const c = Math.cos(pose.sway), s = Math.sin(pose.sway)
      return { x: pivot.x + x * c - y * s, y: pivot.y + x * s + y * c }
    }

    // ---- rasterize the image and read it back as glyph cells ----
    function rasterize(): Cell[] {
      octx!.setTransform(1, 0, 0, 1, 0, 0)
      octx!.clearRect(0, 0, cols, rows)
      octx!.imageSmoothingEnabled = true
      octx!.imageSmoothingQuality = 'high'
      octx!.setTransform(1 / cw, 0, 0, 1 / chH, 0, 0)
      octx!.translate(pivot.x, pivot.y)
      octx!.rotate(pose.sway)
      octx!.scale(pose.sx, pose.sy)
      octx!.drawImage(img, -0.45 * wPx, -hPx, wPx, hPx)

      const pad = 0.25 * wPx
      const c0 = clamp(Math.floor((pivot.x - 0.45 * wPx * 1.2 - pad) / cw), 0, cols - 1)
      const c1 = clamp(Math.ceil((pivot.x + 0.55 * wPx * 1.2 + pad) / cw), 0, cols - 1)
      const r0 = clamp(Math.floor((pivot.y - hPx * 1.25 - pad) / chH), 0, rows - 1)
      const r1 = clamp(Math.ceil((pivot.y + pad) / chH), 0, rows - 1)
      const w = c1 - c0 + 1, h = r1 - r0 + 1
      if (w <= 1 || h <= 1) return []
      const data = octx!.getImageData(c0, r0, w, h).data
      const out: Cell[] = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const a = data[i + 3]
          if (a < 40) continue
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const cx = c0 + x, cy = r0 + y
          const L = 0.3 * r + 0.59 * g + 0.11 * b
          // black outlines, eyes and nose become gaps so the page shows through
          if (L < 52) continue
          // weight saturated colors up so the red cheeks read as solid
          const M = 0.5 * L + 0.5 * Math.max(r, g, b)
          let v = Math.pow(clamp(((M - 55) / 200) * (a / 255), 0, 1), 0.8)
          v += (hash(cx, cy) - 0.5) * 0.1
          const idx = clamp(Math.floor(v * RAMP.length), 1, RAMP.length - 1)
          const boost = clamp(250 / Math.max(r, g, b, 1), 1, 1.6)
          out.push({ cx, cy, ch: RAMP[idx], r: Math.min(255, r * boost), g: Math.min(255, g * boost), b: Math.min(255, b * boost), a: 0.85 + 0.15 * (a / 255) })
        }
      }
      return out
    }

    // reveal from the feet up with a band of static (intro only)
    function materialize(cells: Cell[], k: number, now: number): Cell[] {
      let minY = Infinity, maxY = -Infinity
      for (const c of cells) { minY = Math.min(minY, c.cy); maxY = Math.max(maxY, c.cy) }
      const span = Math.max(1, maxY - minY)
      const front = k * 1.2 - 0.1
      const tick = Math.floor(now * 30)
      const out: Cell[] = []
      for (const c of cells) {
        const rel = (maxY - c.cy) / span
        if (rel > front + 0.08) continue
        if (rel > front) out.push({ ...c, ch: pick(STATIC, hash(c.cx, c.cy, tick)), r: WHITE_Y[0], g: WHITE_Y[1], b: WHITE_Y[2], a: 1 })
        else out.push(c)
      }
      return out
    }

    // ---- lightning ----
    let bolts: Bolt[] = []
    let boltId = 0
    let nextStrike = 0
    let nextCrackle = 0
    function jag(a: V, b: V, rough: number, depth: number): V[] {
      let pts = [a, b]
      let amp = Math.hypot(b.x - a.x, b.y - a.y) * rough
      for (let d = 0; d < depth; d++) {
        const nxt: V[] = [pts[0]]
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1]
          const dx = q.x - p.x, dy = q.y - p.y
          const l = Math.hypot(dx, dy) || 1
          const o = (rng() - 0.5) * 2 * amp
          nxt.push({ x: (p.x + q.x) / 2 + (-dy / l) * o, y: (p.y + q.y) / 2 + (dx / l) * o }, q)
        }
        pts = nxt
        amp *= 0.55
      }
      return pts
    }
    function spawnBolt(a: V, b: V, now: number, strong: boolean, life: number) {
      const main = jag(a, b, 0.16, 6)
      const paths = [main]
      const nb = strong ? 3 : 1 + Math.floor(rng() * 2)
      for (let i = 0; i < nb; i++) {
        const s = main[Math.floor(main.length * (0.2 + rng() * 0.6))]
        const len = Math.hypot(b.x - a.x, b.y - a.y) * (0.12 + rng() * 0.2)
        const ang = Math.atan2(b.y - a.y, b.x - a.x) + (rng() - 0.5) * 1.6
        paths.push(jag(s, { x: s.x + Math.cos(ang) * len, y: s.y + Math.sin(ang) * len }, 0.22, 4))
      }
      bolts.push({ id: boltId++, paths, born: now, life, strong })
    }
    const cheek = () => { const c = CHEEKS[Math.floor(rng() * CHEEKS.length)]; return toS(c.x, c.y) }
    function strike(now: number) {
      const src = cheek()
      const ang = Math.PI * (0.88 + rng() * 0.55) // back across the page, left / up-left
      const len = Math.max(W, H) * (0.45 + rng() * 0.6)
      spawnBolt(src, { x: src.x + Math.cos(ang) * len, y: src.y + Math.sin(ang) * len }, now, true, 0.42)
    }
    function crackle(now: number) {
      const a = cheek()
      const ang = rng() * Math.PI * 2
      const len = hPx * (0.05 + rng() * 0.12)
      spawnBolt(a, { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len }, now, false, 0.16)
    }

    // ---- drawing ----
    const styleCache = new Map<number, string>()
    function style(r: number, g: number, b: number, a: number) {
      const ai = Math.round(clamp(a, 0, 1) * 31)
      const key = ((r >> 3) << 15) | ((g >> 3) << 10) | ((b >> 3) << 5) | ai
      let s = styleCache.get(key)
      if (!s) {
        s = `rgba(${(r >> 3) << 3},${(g >> 3) << 3},${(b >> 3) << 3},${(ai / 31).toFixed(3)})`
        styleCache.set(key, s)
      }
      return s
    }
    function drawCells(cells: Cell[]) {
      let cur = ''
      for (const c of cells) {
        const s = style(c.r, c.g, c.b, c.a)
        if (s !== cur) { ctx!.fillStyle = s; cur = s }
        ctx!.fillText(c.ch, c.cx * cw, c.cy * chH)
      }
    }
    function drawShadow(h: number) {
      // a soft glyph shadow that shrinks while he's in the air
      const half = wPx * 0.32 * (1 - 0.35 * h)
      const cy = Math.round(groundY / chH)
      const n = Math.ceil((half * 2) / cw)
      for (let i = 0; i <= n; i++) {
        const x = footX - half + i * cw
        const e = 1 - Math.abs(i / n - 0.5) * 2
        ctx!.fillStyle = style(YEL[0], YEL[1], YEL[2], (0.12 + 0.2 * e) * (1 - 0.5 * h))
        ctx!.fillText(e > 0.5 ? '_' : '.', Math.round(x / cw) * cw, cy * chH)
      }
    }
    function drawBolts(now: number) {
      bolts = bolts.filter(b => now - b.born < b.life)
      if (!bolts.length) return
      ctx!.font = `bold ${bfs}px ${MONO}`
      for (const b of bolts) {
        const age = (now - b.born) / b.life
        const flick = hash(b.id, Math.floor(now * 45)) > 0.25 ? 1 : 0.4
        const alpha = Math.pow(1 - age, 1.1) * flick
        const reveal = clamp(age / 0.3, 0, 1)
        b.paths.forEach((path, pi) => {
          const total = path.length - 1
          const upto = Math.max(1, Math.floor(total * (pi === 0 ? reveal : clamp(reveal * 1.5 - 0.3, 0, 1))))
          const seen = new Set<number>()
          const core = pi === 0 ? alpha : alpha * 0.75
          for (let i = 0; i < upto; i++) {
            const p = path[i], q = path[i + 1]
            const dx = q.x - p.x, dy = q.y - p.y
            const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (bcw * 0.8)))
            const ang = Math.abs(Math.atan2(dy, dx))
            const ch = ang < Math.PI / 8 || ang > (7 * Math.PI) / 8 ? '-' : ang > (3 * Math.PI) / 8 && ang < (5 * Math.PI) / 8 ? '|' : dx * dy < 0 ? '/' : '\\'
            for (let s = 0; s < steps; s++) {
              const cx = Math.round((p.x + (dx * s) / steps) / bcw), cy = Math.round((p.y + (dy * s) / steps) / bch)
              const key = cx * 100003 + cy
              if (seen.has(key)) continue
              seen.add(key)
              ctx!.fillStyle = style(YEL[0], YEL[1], YEL[2], core * 0.3)
              ctx!.fillText('·', cx * bcw, (cy - 1) * bch)
              ctx!.fillText('·', cx * bcw, (cy + 1) * bch)
              const c = hash(cx, cy, b.id) > (b.strong ? 0.65 : 0.75) ? WHITE_Y : YEL_HI
              ctx!.fillStyle = style(c[0], c[1], c[2], core)
              ctx!.fillText(ch, cx * bcw, cy * bch)
            }
          }
        })
      }
      ctx!.font = `${fs}px ${MONO}`
    }

    // ---- main step ----
    let introBolt = false
    function step(now: number, draw: boolean) {
      const t = now - INTRO
      pose = t > 0 ? bounce(t) : bounce(HOP * HOPS + REST * 0.3) // stand still during the intro
      pivot = { x: footX, y: groundY - pose.h * hopPx }

      if (!reduced) {
        if (!introBolt && now > 0.15) {
          introBolt = true
          const c = toS(0.45, 0.5)
          spawnBolt({ x: c.x - 80 - rng() * 120, y: -10 }, c, now, true, 0.45)
        }
        if (t > 0) {
          if (now > nextStrike) {
            if (nextStrike > 0) strike(now)
            nextStrike = now + 2.2 + rng() * 2.6
          }
          // cheeks crackle constantly, harder while he rests between bounces
          if (now > nextCrackle) {
            crackle(now)
            nextCrackle = now + (pose.resting && pose.rest > 0.2 && pose.rest < 0.75 ? 0.06 + rng() * 0.08 : 0.35 + rng() * 0.6)
          }
        }
      }

      if (!draw) return
      ctx!.clearRect(0, 0, W, H)
      ctx!.font = `${fs}px ${MONO}`
      ctx!.textBaseline = 'top'
      drawBolts(now)
      if (now < 0.35 && !reduced) return
      let cells = rasterize()
      if (!reduced && now < INTRO) cells = materialize(cells, (now - 0.35) / (INTRO - 0.35), now)
      drawShadow(pose.h)
      drawCells(cells)
    }

    // ---- run ----
    let raf = 0
    let alive = true
    const onResize = () => resize()
    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
      else if (!raf && alive && debugT === null && !reduced) { last = 0; raf = requestAnimationFrame(loop) }
    }
    let last = 0
    let clock = 0
    const loop = (ms: number) => {
      const s = ms / 1000
      const dt = last ? Math.min(s - last, 1 / 30) : 1 / 60
      last = s
      clock += dt
      step(clock, true)
      raf = requestAnimationFrame(loop)
    }

    img.onload = () => {
      if (!alive) return
      aspect = img.naturalWidth / img.naturalHeight
      resize()
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', onVis)
      if (debugT !== null || reduced) {
        // still frame: simulate to the target time, draw once
        const target = reduced ? INTRO + HOP * HOPS + REST * 0.4 : (debugT as number)
        for (let tt = 0; tt < target; tt += 1 / 60) step(tt, false)
        step(target, true)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    img.src = SRC

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Portaled to <body> so page-transition transforms can't break
  // position: fixed, and so it sits under the page content.
  return createPortal(<canvas ref={ref} className="runner-canvas" aria-hidden="true" />, document.body)
}
