import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Ambient ASCII Pikachu for the home page.
//
// /pikachu.png is drawn each frame onto a tiny offscreen canvas with one pixel
// per text cell (placed, rotated, squashed for the current moment), read back,
// and printed as monospace glyphs picked by luminance in the image's colors.
//
// Sequence (runs once): he glitches onto a few headings / links, sitting on
// top, hanging underneath, or clinging to the side of the text, sparking from
// his cheeks, then glitches out and zaps to the next one along a bolt. On the
// last perch he glitches harder and explodes into glyphs, the debris re-forms
// in the bottom-right corner, and from then on he bounces there happily.

type V = { x: number; y: number }
type RGB = [number, number, number]
type Cell = { cx: number; cy: number; ch: string; r: number; g: number; b: number; a: number }
type Particle = { x: number; y: number; vx: number; vy: number; ch: string; c: RGB; life: number; max: number }
type ReformP = { sx: number; sy: number; tx: number; ty: number; ch: string; c: RGB; delay: number }
type Bolt = { id: number; paths: V[][]; born: number; life: number; strong: boolean }
type Side = 'top' | 'bottom' | 'left' | 'right' | 'corner'
type Perch = { el: Element | null; side: Side; t: number; tilt: number; mirror: boolean; seed: number }
// sx/sy: squash & stretch, sway: extra rotation, lift: px along "up", shake: screen px
type Look = { sx: number; sy: number; sway: number; lift: number; shake: V }

const SRC = '/pikachu.png'
const RAMP = ' .:-=+*#%@'
const STATIC = '!<>/\\[]{}=+*^~?#01'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const YEL: RGB = [255, 217, 59]
const YEL_HI: RGB = [255, 242, 122]
const ORANGE: RGB = [255, 123, 58]
const RED: RGB = [255, 70, 40]
const WHITE_Y: RGB = [255, 250, 214]

const PIVOT_X = 0.45 // between his feet, in normalized image x
const CHEEKS: V[] = [{ x: 0.206, y: 0.411 }, { x: 0.525, y: 0.51 }]

// ---- timeline ----
type SegName = 'wait' | 'in' | 'hold' | 'out' | 'zap' | 'glitch' | 'explode' | 'reform' | 'idle'
type Seg = { name: SegName; dur: number; hop: number }
const HOPS = 4
const SEGS: Seg[] = (() => {
  const s: Seg[] = [{ name: 'wait', dur: 0.6, hop: -1 }]
  for (let i = 0; i < HOPS; i++) {
    s.push({ name: 'in', dur: 0.42, hop: i }, { name: 'hold', dur: 1.3, hop: i })
    if (i < HOPS - 1) s.push({ name: 'out', dur: 0.26, hop: i }, { name: 'zap', dur: 0.14, hop: i })
  }
  s.push(
    { name: 'glitch', dur: 0.55, hop: HOPS - 1 },
    { name: 'explode', dur: 1.0, hop: -1 },
    { name: 'reform', dur: 1.5, hop: -1 },
    { name: 'idle', dur: Infinity, hop: -1 },
  )
  return s
})()
function segAt(t: number) {
  let acc = 0
  for (let i = 0; i < SEGS.length; i++) {
    const s = SEGS[i]
    if (t < acc + s.dur) return { i, seg: s, local: t - acc, k: s.dur === Infinity ? 0 : (t - acc) / s.dur }
    acc += s.dur
  }
  return { i: SEGS.length - 1, seg: SEGS[SEGS.length - 1], local: 0, k: 0 }
}

// idle bounce cycle: three hops, then a rest
const HOP = 0.5
const NHOP = 3
const REST = 1.5
const CYCLE = HOP * NHOP + REST

// ---- helpers ----
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const easeOut = (t: number) => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) }
const easeIn = (t: number) => { t = clamp(t, 0, 1); return t * t }
const easeInOut = (t: number) => { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t) }
const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
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

// height (0..1), squash/stretch and sway at time t in the idle cycle
function bounce(t: number) {
  const c = ((t % CYCLE) + CYCLE) % CYCLE
  if (c < HOP * NHOP) {
    const n = Math.floor(c / HOP)
    const p = (c - n * HOP) / HOP
    const h = Math.sin(p * Math.PI) * (n === NHOP - 1 ? 1.25 : 1) // last hop is the big one
    const edge = Math.min(p, 1 - p)
    const sq = edge < 0.14 ? 1 - 0.14 * (1 - edge / 0.14) : 1 + 0.05 * h
    return { h, sq, sway: (n % 2 ? 1 : -1) * 0.06 * Math.sin(p * Math.PI), resting: false, rest: 0 }
  }
  const r = (c - HOP * NHOP) / REST
  // settle wobble, breathe, then a little anticipation crouch before hopping again
  const settle = Math.exp(-r * 9) * Math.sin(r * 40) * 0.05
  const crouch = r > 0.85 ? -0.12 * Math.sin(((r - 0.85) / 0.15) * Math.PI * 0.5) : 0
  return { h: 0, sq: 1 + settle + crouch + 0.015 * Math.sin(r * 12), sway: 0, resting: true, rest: r }
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
    const img = new Image()
    let aspect = 1191 / 1254

    let W = 0, H = 0, cw = 3, chH = 5, fs = 4.6, cols = 0, rows = 0
    let bfs = 9, bcw = 5.4, bch = 9.7 // lightning glyph grid
    let Hp = 110, Hc = 180 // his height in px: perched / corner

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
      Hp = mobile ? 80 : clamp(H * 0.13, 95, 125)
      Hc = mobile ? clamp(H * 0.16, 100, 130) : clamp(H * 0.22, 150, 205)
    }

    // ---- perch selection ----
    const used = new Set<Element>()
    const perches: Perch[] = []
    const corner: Perch = { el: null, side: 'corner', t: 0, tilt: 0, mirror: false, seed: 3.1 }

    function choosePerch(): Perch {
      const sel = 'main.site h1, main.site h2, main.site a.name, main.site .tip, main.site .intro, main.site .links a, main.site .avatar'
      const vis = Array.from(document.querySelectorAll(sel)).filter(e => {
        const r = e.getBoundingClientRect()
        return r.width > 20 && r.top > 80 && r.bottom < H - 30 && !used.has(e)
      })
      const mirror = rng() < 0.5
      const seed = rng() * 10
      const tilt = (rng() - 0.5) * 0.35
      if (!vis.length) return { el: null, side: 'top', t: rng(), tilt, mirror, seed }
      // prefer elements far from the previous perch so hops travel
      const prev = perches.length ? anchorOf(perches[perches.length - 1]).A : { x: W / 2, y: H / 2 }
      vis.sort((a, b) => {
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
        const da = Math.hypot(ra.left + ra.width / 2 - prev.x, ra.top - prev.y)
        const db = Math.hypot(rb.left + rb.width / 2 - prev.x, rb.top - prev.y)
        return db - da
      })
      const el = vis[Math.floor(rng() * Math.min(4, vis.length))]
      used.add(el)
      const r = el.getBoundingClientRect()
      const roll = rng()
      let side: Side = 'top'
      const roomL = r.left > Hp
      const roomR = W - r.right > Hp
      if (roll < 0.3 && (roomL || roomR)) side = roomR && (!roomL || rng() < 0.5) ? 'right' : 'left'
      else if (roll < 0.55 || r.top - Hp < 70) side = 'bottom'
      return { el, side, t: 0.15 + 0.7 * rng(), tilt, mirror, seed }
    }

    // where his feet go, and which way is "up" for his body
    function anchorOf(p: Perch): { A: V; up: V } {
      if (p.side === 'corner') return { A: { x: W - Hc * aspect * 0.55 - 24, y: H - 10 }, up: { x: 0, y: -1 } }
      if (!p.el) return { A: { x: W * (0.15 + 0.7 * p.t), y: H * 0.6 }, up: { x: 0, y: -1 } }
      const r = p.el.getBoundingClientRect()
      const rot = (u: V): V => ({ x: u.x * Math.cos(p.tilt) - u.y * Math.sin(p.tilt), y: u.x * Math.sin(p.tilt) + u.y * Math.cos(p.tilt) })
      switch (p.side) {
        case 'bottom': return { A: { x: r.left + r.width * p.t, y: r.bottom - r.height * 0.15 }, up: rot({ x: 0, y: 1 }) }
        case 'left': return { A: { x: r.left - 2, y: r.top + r.height / 2 }, up: rot({ x: -1, y: 0 }) }
        case 'right': return { A: { x: r.right + 2, y: r.top + r.height / 2 }, up: rot({ x: 1, y: 0 }) }
        default: return { A: { x: r.left + r.width * p.t, y: r.top + r.height * 0.2 }, up: rot({ x: 0, y: -1 }) }
      }
    }

    // ---- frame transform: local image px (x right, y down, feet at 0,0) -> screen px ----
    let M = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }
    let curH = Hp, curW = Hp * aspect
    function place(perch: Perch, h: number, look: Look) {
      curH = h
      curW = h * aspect
      const { A, up: up0 } = anchorOf(perch)
      const cs = Math.cos(look.sway), sn = Math.sin(look.sway)
      const up = { x: up0.x * cs - up0.y * sn, y: up0.x * sn + up0.y * cs }
      const R0 = { x: -up.y, y: up.x }
      const R = perch.mirror ? { x: -R0.x, y: -R0.y } : R0
      M = {
        a: R.x * look.sx, b: R.y * look.sx,
        c: -up.x * look.sy, d: -up.y * look.sy,
        e: A.x + up0.x * look.lift + look.shake.x, f: A.y + up0.y * look.lift + look.shake.y,
      }
    }
    const toS = (x: number, y: number): V => ({ x: M.a * x + M.c * y + M.e, y: M.b * x + M.d * y + M.f })
    // normalized image coords (0..1) -> screen
    const imgS = (u: number, v: number) => toS((u - PIVOT_X) * curW, (v - 1) * curH)

    // ---- rasterize the image and read it back as glyph cells ----
    let bodyCenter: V = { x: 0, y: 0 }
    function rasterize(): Cell[] {
      octx!.setTransform(1, 0, 0, 1, 0, 0)
      octx!.clearRect(0, 0, cols, rows)
      octx!.imageSmoothingEnabled = true
      octx!.imageSmoothingQuality = 'high'
      octx!.setTransform(1 / cw, 0, 0, 1 / chH, 0, 0)
      octx!.transform(M.a, M.b, M.c, M.d, M.e, M.f)
      octx!.drawImage(img, -PIVOT_X * curW, -curH, curW, curH)

      bodyCenter = imgS(0.45, 0.55)
      const corners = [imgS(0, 0), imgS(1, 0), imgS(0, 1), imgS(1, 1)]
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const p of corners) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
      const c0 = clamp(Math.floor(x0 / cw) - 1, 0, cols - 1)
      const c1 = clamp(Math.ceil(x1 / cw) + 1, 0, cols - 1)
      const r0 = clamp(Math.floor(y0 / chH) - 1, 0, rows - 1)
      const r1 = clamp(Math.ceil(y1 / chH) + 1, 0, rows - 1)
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
          const Mx = 0.5 * L + 0.5 * Math.max(r, g, b)
          let v = Math.pow(clamp(((Mx - 55) / 200) * (a / 255), 0, 1), 0.8)
          v += (hash(cx, cy) - 0.5) * 0.1
          const idx = clamp(Math.floor(v * RAMP.length), 1, RAMP.length - 1)
          const boost = clamp(250 / Math.max(r, g, b, 1), 1, 1.6)
          out.push({ cx, cy, ch: RAMP[idx], r: Math.min(255, r * boost), g: Math.min(255, g * boost), b: Math.min(255, b * boost), a: 0.85 + 0.15 * (a / 255) })
        }
      }
      return out
    }

    // ---- cell effects ----
    function materialize(cells: Cell[], k: number, now: number): Cell[] {
      let minY = Infinity, maxY = -Infinity
      for (const c of cells) { minY = Math.min(minY, c.cy); maxY = Math.max(maxY, c.cy) }
      const span = Math.max(1, maxY - minY)
      const front = k * 1.25 - 0.1
      const tick = Math.floor(now * 30)
      const out: Cell[] = []
      for (const c of cells) {
        const rel = (maxY - c.cy) / span
        if (rel > front + 0.08) {
          if (hash(c.cx, c.cy, tick) < 0.06) out.push({ ...c, ch: '.', r: YEL[0], g: YEL[1], b: YEL[2], a: 0.5 })
        } else if (rel > front) {
          out.push({ ...c, ch: pick(STATIC, hash(c.cx, c.cy, tick)), r: WHITE_Y[0], g: WHITE_Y[1], b: WHITE_Y[2], a: 1 })
        } else out.push(c)
      }
      return out
    }
    function glitch(cells: Cell[], g: number, now: number): Cell[] {
      if (g <= 0) return cells
      const tick = Math.floor(now * 30)
      const out: Cell[] = []
      for (const c of cells) {
        const rowHit = hash(c.cy >> 1, tick) > 1 - 0.45 * g
        const shift = rowHit ? Math.round((hash(c.cy >> 1, tick, 3) - 0.5) * 16 * g) : 0
        let n: Cell = { ...c, cx: c.cx + shift }
        if (hash(c.cx, c.cy, tick) < 0.3 * g) n.ch = pick(STATIC, hash(c.cy, c.cx, tick))
        if (hash(c.cx, c.cy, tick + 1) < 0.2 * g) n = { ...n, r: WHITE_Y[0], g: WHITE_Y[1], b: WHITE_Y[2] }
        out.push(n)
        if (hash(c.cx, c.cy, tick + 2) < 0.35 * g) out.push({ ...c, cx: c.cx + 3, r: RED[0], g: RED[1], b: RED[2], a: 0.45 * g })
        if (hash(c.cx, c.cy, tick + 4) < 0.25 * g) out.push({ ...c, cx: c.cx - 3, r: YEL_HI[0], g: YEL_HI[1], b: YEL_HI[2], a: 0.4 * g })
      }
      return out
    }

    // ---- particles, reform ----
    let particles: Particle[] = []
    let reformPs: ReformP[] = []
    let reformStart = 0
    function spawnExplosion(cells: Cell[]) {
      const S = curH
      for (const c of cells) {
        const x = c.cx * cw, y = c.cy * chH
        const dx = x - bodyCenter.x, dy = y - bodyCenter.y
        const d = Math.hypot(dx, dy) || 1
        const sp = (0.6 + rng() * 1.6) * S * (0.8 + d / S) * 1.4
        const ang = (rng() - 0.5) * 0.9
        const ux = dx / d, uy = dy / d
        const max = 0.8 + rng() * 0.9
        particles.push({
          x, y,
          vx: (ux * Math.cos(ang) - uy * Math.sin(ang)) * sp,
          vy: (ux * Math.sin(ang) + uy * Math.cos(ang)) * sp - rng() * 0.5 * S,
          ch: c.ch, c: [c.r, c.g, c.b], life: max, max,
        })
      }
    }
    function stepParticles(dt: number) {
      const g = 160
      for (const p of particles) {
        p.vx *= 1 - 1.6 * dt
        p.vy = p.vy * (1 - 1.6 * dt) + g * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
        if (rng() < dt * 10) p.ch = pick(STATIC + '-=+*#', rng())
      }
      particles = particles.filter(p => p.life > 0 && p.y < H + 20)
    }
    function beginReform(targets: Cell[], now: number) {
      reformStart = now
      reformPs = targets.map((c, i) => {
        const src = particles.length ? particles[i % particles.length] : null
        const sx = src ? src.x : rng() * W
        const sy = src ? src.y : rng() * H
        return { sx, sy, tx: c.cx * cw, ty: c.cy * chH, ch: c.ch, c: [c.r, c.g, c.b] as RGB, delay: rng() * 0.45 }
      })
      for (const p of particles) p.life = Math.min(p.life, 0.35)
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
    function spawnBolt(a: V, b: V, now: number, strong: boolean, life = 0.32) {
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
    const cheek = () => { const c = CHEEKS[Math.floor(rng() * CHEEKS.length)]; return imgS(c.x, c.y) }
    function strike(now: number, fromCorner: boolean) {
      const src = cheek()
      // aim away from his body; from the corner, always back across the page
      const ang = fromCorner ? Math.PI * (0.88 + rng() * 0.55) : Math.atan2(src.y - bodyCenter.y, src.x - bodyCenter.x) + (rng() - 0.5) * 1.4
      const len = Math.max(W, H) * (0.45 + rng() * 0.6)
      spawnBolt(src, { x: src.x + Math.cos(ang) * len, y: src.y + Math.sin(ang) * len }, now, true, 0.42)
    }
    function crackle(now: number) {
      const a = cheek()
      const ang = rng() * Math.PI * 2
      const len = curH * (0.05 + rng() * 0.12)
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
    function drawCells(cells: Cell[], tint?: RGB) {
      let cur = ''
      for (const c of cells) {
        const s = tint ? style(tint[0], tint[1], tint[2], c.a) : style(c.r, c.g, c.b, c.a)
        if (s !== cur) { ctx!.fillStyle = s; cur = s }
        ctx!.fillText(c.ch, c.cx * cw, c.cy * chH)
      }
    }
    function drawShadow(h: number) {
      // a soft glyph shadow that shrinks while he's in the air
      const { A } = anchorOf(corner)
      const half = Hc * aspect * 0.32 * (1 - 0.35 * h)
      const cy = Math.round(A.y / chH)
      const n = Math.ceil((half * 2) / cw)
      for (let i = 0; i <= n; i++) {
        const e = 1 - Math.abs(i / n - 0.5) * 2
        ctx!.fillStyle = style(YEL[0], YEL[1], YEL[2], (0.12 + 0.2 * e) * (1 - 0.5 * h))
        ctx!.fillText(e > 0.5 ? '_' : '.', Math.round((A.x - half + i * cw) / cw) * cw, cy * chH)
      }
    }
    function drawParticles(now: number, explodeAt: number) {
      const flash = explodeAt >= 0 && now - explodeAt < 0.08
      for (const p of particles) {
        const t = 1 - p.life / p.max
        let c = mixc(p.c, ORANGE, clamp(t * 1.4, 0, 1))
        let a = Math.pow(p.life / p.max, 0.7)
        if (flash) { c = WHITE_Y; a = 1 }
        ctx!.fillStyle = style(c[0], c[1], c[2], a)
        ctx!.fillText(flash ? '@' : p.ch, Math.round(p.x / cw) * cw, Math.round(p.y / chH) * chH)
      }
      if (explodeAt >= 0 && now - explodeAt < 0.5) {
        const k = (now - explodeAt) / 0.5
        const R = (0.2 + 1.5 * easeOut(k)) * Hp
        const steps = Math.ceil((2 * Math.PI * R) / (cw * 1.6))
        ctx!.fillStyle = style(YEL_HI[0], YEL_HI[1], YEL_HI[2], (1 - k) * 0.85)
        for (let i = 0; i < steps; i++) {
          const ang = (i / steps) * Math.PI * 2
          ctx!.fillText(hash(i, Math.floor(now * 20)) > 0.5 ? '*' : '+', Math.round((bodyCenter.x + Math.cos(ang) * R) / cw) * cw, Math.round((bodyCenter.y + Math.sin(ang) * R) / chH) * chH)
        }
      }
    }
    function drawReform(now: number) {
      for (const p of reformPs) {
        const k = clamp((now - reformStart - p.delay) / 0.95, 0, 1)
        const e = easeInOut(k)
        const j = (1 - e) * 6
        const x = p.sx + (p.tx - p.sx) * e + (rng() - 0.5) * j
        const y = p.sy + (p.ty - p.sy) * e + (rng() - 0.5) * j
        const c = mixc(WHITE_Y, p.c, k)
        ctx!.fillStyle = style(c[0], c[1], c[2], 0.35 + 0.65 * k)
        ctx!.fillText(k < 0.85 ? pick(STATIC, rng()) : p.ch, Math.round(x / cw) * cw, Math.round(y / chH) * chH)
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
        const reveal = clamp(age / 0.3, 0, 1) // streak across, then hold and fade
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
    let lastSeg = -1
    let lastCells: Cell[] = []
    let explodeAt = -1
    let idleStart = -1

    function centerOf(p: Perch): V {
      const { A, up } = anchorOf(p)
      return { x: A.x + up.x * Hp * 0.5, y: A.y + up.y * Hp * 0.5 }
    }
    const still = (): Look => ({ sx: 1, sy: 1, sway: 0, lift: 0, shake: { x: 0, y: 0 } })
    function idleLook(t: number): Look {
      const b = bounce(t)
      return { sx: 1 / Math.sqrt(b.sq), sy: b.sq, sway: b.sway, lift: b.h * Hc * 0.16, shake: { x: 0, y: 0 } }
    }

    function enter(seg: Seg, now: number) {
      if (seg.name === 'in') {
        if (!perches[seg.hop]) perches[seg.hop] = choosePerch()
        if (seg.hop === 0) {
          const c = centerOf(perches[0])
          spawnBolt({ x: c.x - 60 - rng() * 140, y: -10 }, c, now, true, 0.4)
        }
      } else if (seg.name === 'zap') {
        perches[seg.hop + 1] = choosePerch()
        spawnBolt(centerOf(perches[seg.hop]), centerOf(perches[seg.hop + 1]), now, true, 0.38)
      } else if (seg.name === 'explode') {
        explodeAt = now
        spawnExplosion(lastCells)
        spawnBolt(bodyCenter, { x: bodyCenter.x + (rng() - 0.5) * W * 0.6, y: -10 }, now, true, 0.4)
      } else if (seg.name === 'reform') {
        // rasterize the corner pose once to get the target glyphs
        place(corner, Hc, idleLook(0))
        beginReform(rasterize(), now)
      } else if (seg.name === 'idle') {
        idleStart = now
        reformPs = []
        nextStrike = now + 1.2
      }
    }

    function step(now: number, dt: number, draw: boolean) {
      const { i, seg, k } = segAt(now)
      if (i !== lastSeg) {
        for (let j = lastSeg + 1; j <= i; j++) enter(SEGS[j], now)
        lastSeg = i
      }

      let cells: Cell[] = []
      let perch: Perch | null = null
      let bounceH = 0
      let resting = false
      if (seg.name === 'in' || seg.name === 'hold' || seg.name === 'out' || seg.name === 'glitch') perch = perches[seg.hop]
      if (seg.name === 'idle') perch = corner

      if (perch) {
        let look = still()
        if (seg.name === 'idle') {
          const it = now - idleStart
          const b = bounce(it)
          look = idleLook(it)
          bounceH = b.h
          resting = b.resting && b.rest > 0.2 && b.rest < 0.75
        } else {
          // gentle breathing while perched
          const br = 0.02 * Math.sin(now * 3 + perch.seed)
          look.sy = 1 + br
          look.sx = 1 - br * 0.5
          look.sway = 0.04 * Math.sin(now * 1.3 + perch.seed)
          if (seg.name === 'in') { look.sx = 0.15 + 0.85 * easeOut(k * 1.8); look.sy = 1.3 - 0.3 * easeOut(k * 1.8) }
          if (seg.name === 'out') { look.sx = 1 - 0.92 * easeIn(k); look.sy = 1 + 0.4 * easeIn(k) }
          if (seg.name === 'glitch') look.shake = { x: (rng() - 0.5) * 6 * k, y: (rng() - 0.5) * 3 * k }
        }
        place(perch, seg.name === 'idle' ? Hc : Hp, look)
        cells = rasterize()
        if (seg.name === 'in') cells = glitch(materialize(cells, k, now), (1 - k) * 0.8, now)
        else if (seg.name === 'out') cells = glitch(cells, 0.4 + 0.6 * k, now)
        else if (seg.name === 'glitch') cells = glitch(cells, 0.3 + 0.7 * k, now)
        lastCells = cells

        // lightning out of his cheeks while he's solid
        if (!reduced && (seg.name === 'hold' || seg.name === 'idle' || (seg.name === 'in' && k > 0.6))) {
          if (now > nextStrike) {
            strike(now, seg.name === 'idle')
            nextStrike = now + (seg.name === 'idle' ? 2.2 + rng() * 2.6 : 0.6 + rng() * 0.8)
          }
          if (now > nextCrackle) {
            crackle(now)
            nextCrackle = now + (resting ? 0.06 + rng() * 0.08 : 0.3 + rng() * 0.6)
          }
        }
      }

      stepParticles(dt)

      if (!draw) return
      ctx!.clearRect(0, 0, W, H)
      ctx!.font = `${fs}px ${MONO}`
      ctx!.textBaseline = 'top'
      drawBolts(now)
      drawParticles(now, explodeAt)
      if (seg.name === 'reform') drawReform(now)
      if (seg.name === 'idle') drawShadow(bounceH)
      if (cells.length) drawCells(cells, idleStart >= 0 && now - idleStart < 0.12 ? WHITE_Y : undefined)
    }

    // ---- run ----
    let raf = 0
    let alive = true
    let last = 0
    let clock = 0
    const onResize = () => resize()
    const loop = (ms: number) => {
      const s = ms / 1000
      const dt = last ? Math.min(s - last, 1 / 30) : 1 / 60
      last = s
      clock += dt
      step(clock, dt, true)
      raf = requestAnimationFrame(loop)
    }
    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
      else if (!raf && alive && debugT === null && !reduced) { last = 0; raf = requestAnimationFrame(loop) }
    }

    img.onload = () => {
      if (!alive) return
      aspect = img.naturalWidth / img.naturalHeight
      resize()
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', onVis)
      if (debugT !== null || reduced) {
        // still frame: simulate to the target time, draw once
        const target = reduced ? 20 : (debugT as number)
        for (let tt = 0; tt < target; tt += 1 / 60) step(tt, 1 / 60, false)
        step(target, 1 / 60, true)
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
