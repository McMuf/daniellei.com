import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Ambient ASCII critter for the home page.
//
// An original chubby electric critter: round yellow body, glowing spark-tipped
// ears, charge-up cheek pads, and a curly cord tail ending in a spark orb.
// Each frame it is posed as a flat 2D rig, painted as low-poly shapes onto a
// tiny offscreen canvas with one pixel per text cell, and read back as
// monospace glyphs picked by brightness.
//
// Sequence (runs once): a lightning strike drops it onto a heading, it sits /
// waves / looks around while sparking from its cheeks, then crouches and dashes
// along a bolt to the next bit of text. On the last perch it charges up,
// overloads in a burst of thunder, the sparks re-form in the bottom-right
// corner, and it stays there idling (ear flicks, tail wags, blinks, waves, and
// the occasional bolt fired across the page).

type V = { x: number; y: number }
type RGB = [number, number, number]

type Pose = {
  lean: number // whole-body lean (+ = right)
  head: number // head tilt relative to body
  earL: number; earR: number // ear spread (+ = outward / droop)
  armL: number; armR: number // stubby arm angle from "down" (+ = outward / up)
  sq: number // squash (<1) / stretch (>1), anchored at the feet
  wave: number // amplitude of a right-arm wave
}
type Face = { blink: number; mouth: number; cheek: number; wag: number; orb: number }

type Cell = { cx: number; cy: number; ch: string; r: number; g: number; b: number; a: number }
type Particle = { x: number; y: number; vx: number; vy: number; ch: string; c: RGB; life: number; max: number }
type ReformP = { sx: number; sy: number; tx: number; ty: number; ch: string; c: RGB; delay: number }
type Bolt = { id: number; paths: V[][]; born: number; life: number; strong: boolean }
type Side = 'top' | 'bottom' | 'left' | 'right' | 'corner'
type Perch = { el: Element | null; side: Side; t: number; tilt: number; pose: Pose; mirror: boolean; seed: number }

const RAMP = ' .:-=+*#%@'
const STATIC = '!<>/\\[]{}=+*^~?#01'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const YEL_HI = hex('#fff27a')
const YEL = hex('#ffd93b')
const YEL_MID = hex('#f2c21b')
const YEL_SH = hex('#c48a0c')
const ORANGE = hex('#ff7b3a')
const WHITE_Y: RGB = [255, 250, 214]
const WHITE: RGB = [255, 255, 255]

// ---- poses (front view; the critter is about 5 units tall to the ear tips) ----
const SIT: Pose = { lean: 0, head: 0, earL: 0, earR: 0, armL: 0.3, armR: 0.3, sq: 1, wave: 0 }
const WAVE: Pose = { lean: -0.05, head: 0.14, earL: -0.05, earR: 0.1, armL: 0.25, armR: 2.5, sq: 1, wave: 0.35 }
const CURIOUS: Pose = { lean: 0.1, head: -0.32, earL: -0.12, earR: 0.32, armL: 0.55, armR: 0.15, sq: 0.97, wave: 0 }
const CHEER: Pose = { lean: 0, head: 0.05, earL: -0.15, earR: -0.15, armL: 2.2, armR: 2.2, sq: 1.04, wave: 0.15 }
const CHARGE: Pose = { lean: 0, head: 0, earL: -0.24, earR: -0.24, armL: 1.3, armR: 1.3, sq: 0.9, wave: 0 }
const CROUCH: Pose = { lean: 0, head: -0.1, earL: 0.3, earR: 0.3, armL: 0.65, armR: 0.65, sq: 0.72, wave: 0 }
const POSES = [SIT, WAVE, CURIOUS, CHEER]

// ---- timeline ----
type SegName = 'wait' | 'in' | 'hold' | 'out' | 'zap' | 'charge' | 'explode' | 'reform' | 'idle'
type Seg = { name: SegName; dur: number; hop: number }
const HOPS = 4
const SEGS: Seg[] = (() => {
  const s: Seg[] = [{ name: 'wait', dur: 0.6, hop: -1 }]
  for (let i = 0; i < HOPS; i++) {
    s.push({ name: 'in', dur: 0.45, hop: i }, { name: 'hold', dur: 1.5, hop: i })
    if (i < HOPS - 1) s.push({ name: 'out', dur: 0.3, hop: i }, { name: 'zap', dur: 0.12, hop: i })
  }
  s.push(
    { name: 'charge', dur: 1.3, hop: HOPS - 1 },
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

// ---- helpers ----
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const easeOut = (t: number) => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) }
const easeIn = (t: number) => { t = clamp(t, 0, 1); return t * t }
const easeInOut = (t: number) => { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t) }
const dirv = (a: number): V => ({ x: Math.sin(a), y: -Math.cos(a) }) // from "down", + rotates right
const upv = (a: number): V => ({ x: Math.sin(a), y: Math.cos(a) })
const add = (a: V, d: V, s: number): V => ({ x: a.x + d.x * s, y: a.y + d.y * s })
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
function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const o = { ...a }
  for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = lerp(a[k], b[k], t)
  return o
}
function ell(c: V, ax: V, ay: V, rx: number, ry: number, n = 12): V[] {
  const pts: V[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push(add(add(c, ax, Math.cos(a) * rx), ay, Math.sin(a) * ry))
  }
  return pts
}

// ---- rig (rig space: y up, feet near the origin) ----
function build(p: Pose, wag: number) {
  const u = upv(p.lean)
  const r = { x: u.y, y: -u.x }
  const O = { x: 0, y: 0 }
  const at = (x: number, y: number) => add(add(O, r, x), u, y)
  const ha = p.lean + p.head
  const hu = upv(ha)
  const hr = { x: hu.y, y: -hu.x }
  const headC = add(at(0, 1.9), hu, 0.82)
  const hat = (x: number, y: number) => add(add(headC, hr, x), hu, y)
  const ear = (side: number, a: number) => {
    const base = hat(side * 0.52, 0.6)
    const eu = upv(ha + side * (0.34 + a))
    const en = { x: eu.y, y: -eu.x }
    return { base, eu, en, tip: add(base, eu, 1.62) }
  }
  const arm = (side: number, a: number) => {
    const sh = at(side * 0.6, 1.5)
    return { sh, hand: add(sh, dirv(side * a + p.lean), 0.58) }
  }
  // curly cord tail off the back-right, wagging around its root
  const tail: V[] = []
  const root = at(0.5, 0.5)
  const wa = p.lean + wag
  for (let i = 0; i <= 9; i++) {
    const s = i / 9
    const lx = 1.35 * s + 0.14 * Math.sin(s * 6 + wag * 3)
    const ly = 1.85 * s
    tail.push({ x: root.x + lx * Math.cos(wa) + ly * Math.sin(wa), y: root.y - lx * Math.sin(wa) + ly * Math.cos(wa) })
  }
  const footL = at(-0.42, 0.14)
  const footR = at(0.42, 0.14)
  const foot = Math.min(footL.y, footR.y) - 0.15
  return { u, r, at, ha, hu, hr, headC, hat, earL: ear(-1, p.earL), earR: ear(1, p.earR), armL: arm(-1, p.armL), armR: arm(1, p.armR), tail, footL, footR, foot }
}
type Rig = ReturnType<typeof build>

function flick(t: number, seed: number) {
  const w = 1.3
  const n = Math.floor(t * w + seed)
  if (hash(n, 77, Math.floor(seed * 100)) < 0.72) return 0
  const ph = t * w + seed - n
  return ph < 0.22 ? 0.45 * Math.sin((ph / 0.22) * Math.PI) : 0
}
function animate(base: Pose, t: number, seed: number): Pose {
  const o = { ...base }
  o.sq += 0.03 * Math.sin(t * 2.6 + seed)
  o.head += 0.12 * Math.sin(t * 0.55 + seed) + 0.04 * Math.sin(t * 1.9 + seed)
  o.lean += 0.04 * Math.sin(t * 0.7 + seed)
  o.earL += 0.06 * Math.sin(t * 1.4 + seed) + flick(t, seed)
  o.earR += 0.06 * Math.sin(t * 1.2 + seed + 2) + flick(t, seed + 5.3)
  o.armL += 0.05 * Math.sin(t * 1.5 + seed)
  o.armR += o.wave * Math.sin(t * 9)
  return o
}
function blinkAt(t: number, seed: number) {
  const per = 3.4
  const ph = (((t + seed * 1.7) % per) + per) % per / per
  return ph > 0.96 ? 1 : 0
}

export default function SparkCritter() {
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
    const debugT = params.has('perch_t') ? Number(params.get('perch_t')) : null
    const rng = mulberry32(debugT !== null ? 7 : (Date.now() & 0xffffffff))

    let W = 0, H = 0, cw = 3, chH = 5, fs = 4.6, cols = 0, rows = 0
    let bfs = 9, bcw = 5.4, bch = 9.7 // lightning glyph grid
    let Up = 26, Uc = 46 // perched / corner scale (px per rig unit)

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
      Up = (mobile ? 85 : clamp(H * 0.17, 115, 150)) / 5
      Uc = (mobile ? clamp(H * 0.18, 100, 135) : clamp(H * 0.26, 150, 235)) / 5
    }
    resize()

    // ---- perch selection ----
    const used = new Set<Element>()
    const perches: Perch[] = []
    const corner: Perch = { el: null, side: 'corner', t: 0, tilt: 0, pose: SIT, mirror: true, seed: 3.1 }

    function choosePerch(): Perch {
      const sel = 'main.site h1, main.site h2, main.site a.name, main.site .tip, main.site .intro, main.site .links a, main.site .avatar'
      const charH = 5.2 * Up
      const vis = Array.from(document.querySelectorAll(sel)).filter(e => {
        const r = e.getBoundingClientRect()
        return r.width > 20 && r.top > 80 && r.bottom < H - 30 && !used.has(e)
      })
      const pose = POSES[Math.floor(rng() * POSES.length)]
      const mirror = rng() < 0.5
      const seed = rng() * 10
      const tilt = (rng() - 0.5) * 0.25
      if (!vis.length) return { el: null, side: 'top', t: rng(), tilt, pose, mirror, seed }
      // prefer elements far from the previous perch so dashes travel
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
      const roomL = r.left > 3.5 * Up
      const roomR = W - r.right > 3.5 * Up
      if (roll < 0.25 && (roomL || roomR)) side = roomR && (!roomL || rng() < 0.5) ? 'right' : 'left'
      else if (r.top - charH < 70) side = 'bottom'
      return { el, side, t: 0.15 + 0.7 * rng(), tilt, pose, mirror, seed }
    }

    // where the feet go, and which way is "up" for its body
    function anchorOf(p: Perch): { A: V; up: V } {
      if (p.side === 'corner') return { A: { x: W - 2.4 * Uc - 24, y: H - 4 }, up: { x: 0, y: -1 } }
      if (!p.el) return { A: { x: W * (0.15 + 0.7 * p.t), y: H * 0.6 }, up: { x: 0, y: -1 } }
      const r = p.el.getBoundingClientRect()
      const rot = (u: V): V => ({ x: u.x * Math.cos(p.tilt) - u.y * Math.sin(p.tilt), y: u.x * Math.sin(p.tilt) + u.y * Math.cos(p.tilt) })
      switch (p.side) {
        case 'bottom': return { A: { x: r.left + r.width * p.t, y: r.bottom - r.height * 0.18 }, up: rot({ x: 0, y: 1 }) }
        case 'left': return { A: { x: r.left - 2, y: r.top + r.height / 2 }, up: rot({ x: -1, y: 0 }) }
        case 'right': return { A: { x: r.right + 2, y: r.top + r.height / 2 }, up: rot({ x: 1, y: 0 }) }
        default: return { A: { x: r.left + r.width * p.t, y: r.top + r.height * 0.2 }, up: rot({ x: 0, y: -1 }) }
      }
    }

    // ---- transform for the current frame ----
    let toS: (p: V) => V = p => p
    let U = Up
    function setTransform(rig: Rig, perch: Perch, scale: number, sx: number, sy: number, shake: V) {
      U = scale
      const { A, up } = anchorOf(perch)
      const R0 = { x: -up.y, y: up.x }
      const R = perch.mirror ? { x: -R0.x, y: -R0.y } : R0
      const foot = rig.foot
      toS = (p: V) => {
        const x = p.x * sx * U
        const y = (p.y - foot) * sy * U
        return { x: A.x + R.x * x + up.x * y + shake.x, y: A.y + R.y * x + up.y * y + shake.y }
      }
    }

    // ---- low-poly painting ----
    const LIGHT = { x: -0.54, y: -0.84 }
    const rgbStr = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    let bx0 = 0, by0 = 0, bx1 = 0, by1 = 0
    function track(pts: V[]) {
      for (const p of pts) {
        if (p.x < bx0) bx0 = p.x
        if (p.y < by0) by0 = p.y
        if (p.x > bx1) bx1 = p.x
        if (p.y > by1) by1 = p.y
      }
    }

    function facet(pts: V[], base: RGB, contrast = 0.4) {
      track(pts)
      let cx = 0, cy = 0
      for (const p of pts) { cx += p.x; cy += p.y }
      cx /= pts.length
      cy /= pts.length
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        let nx = b.y - a.y
        let ny = -(b.x - a.x)
        if (nx * ((a.x + b.x) / 2 - cx) + ny * ((a.y + b.y) / 2 - cy) < 0) { nx = -nx; ny = -ny }
        const d = (nx * LIGHT.x + ny * LIGHT.y) / (Math.hypot(nx, ny) || 1)
        const f = 1.0 - contrast * 0.55 + contrast * 0.55 * d
        octx!.fillStyle = rgbStr([Math.min(255, base[0] * f), Math.min(255, base[1] * f), Math.min(255, base[2] * f)])
        octx!.beginPath()
        octx!.moveTo(cx, cy)
        octx!.lineTo(a.x, a.y)
        octx!.lineTo(b.x, b.y)
        octx!.closePath()
        octx!.fill()
      }
    }
    function poly(pts: V[], c: RGB) {
      octx!.fillStyle = rgbStr(c)
      octx!.beginPath()
      pts.forEach((p, i) => (i ? octx!.lineTo(p.x, p.y) : octx!.moveTo(p.x, p.y)))
      octx!.closePath()
      octx!.fill()
    }
    function limb(a: V, b: V, wa: number, wb: number, c: RGB) {
      const dx = b.x - a.x, dy = b.y - a.y
      const l = Math.hypot(dx, dy) || 1
      const n = { x: -dy / l, y: dx / l }
      facet([add(a, n, wa), add(b, n, wb), add(b, n, -wb), add(a, n, -wa)].map(toS), c)
      facet([add(b, n, wb), add(b, { x: dx / l, y: dy / l }, wb * 0.9), add(b, n, -wb)].map(toS), c)
    }

    function drawTail(rg: Rig, orb: number) {
      const T = rg.tail
      const n = T.length - 1
      for (let i = 0; i < n; i++) limb(T[i], T[i + 1], 0.27 - 0.12 * (i / n), 0.27 - 0.12 * ((i + 1) / n), i % 2 ? YEL_MID : YEL_SH)
      facet(ell(T[n], { x: 1, y: 0 }, { x: 0, y: 1 }, 0.27, 0.27, 8).map(toS), mixc(YEL_HI, WHITE_Y, orb), 0.3)
    }

    function drawBody(rg: Rig) {
      const B: [number, number][] = [[0, 2.02], [0.48, 1.92], [0.74, 1.58], [0.84, 1.05], [0.8, 0.55], [0.58, 0.2], [0.2, 0.1]]
      const pts = [...B.map(([x, y]) => rg.at(x, y)), ...B.slice(1).reverse().map(([x, y]) => rg.at(-x, y))]
      facet(ell(rg.footL, rg.r, rg.u, 0.3, 0.15, 8).map(toS), YEL_SH, 0.3)
      facet(ell(rg.footR, rg.r, rg.u, 0.3, 0.15, 8).map(toS), YEL_SH, 0.3)
      facet(pts.map(toS), YEL_MID, 0.6)
      facet(ell(rg.at(0, 0.95), rg.r, rg.u, 0.48, 0.58, 10).map(toS), YEL_HI, 0.2)
    }

    function drawArm(a: Rig['armL']) {
      limb(a.sh, a.hand, 0.17, 0.13, YEL)
    }

    function drawEar(e: Rig['earL'], tip: RGB) {
      const P = (l: number, w: number) => toS(add(add(e.base, e.eu, l), e.en, w))
      facet([P(0, -0.26), P(0.8, -0.3), P(1.62, 0), P(0.8, 0.3), P(0, 0.26)], YEL, 0.5)
      facet([P(1.0, -0.23), P(1.62, 0), P(1.0, 0.23)], tip, 0.3)
    }

    function drawHead(rg: Rig, f: Face, now: number) {
      const tipGlow = 0.55 + 0.45 * (hash(Math.floor(now * 14), 3) > 0.5 ? 1 : 0)
      const tip = mixc(YEL_HI, WHITE_Y, tipGlow)
      drawEar(rg.earL, tip)
      drawEar(rg.earR, tip)
      // fluffy jaw tufts
      facet([rg.hat(-0.9, -0.12), rg.hat(-1.36, -0.44), rg.hat(-0.8, -0.56)].map(toS), YEL_MID)
      facet([rg.hat(0.9, -0.12), rg.hat(1.36, -0.44), rg.hat(0.8, -0.56)].map(toS), YEL_MID)
      facet(ell(rg.headC, rg.hr, rg.hu, 1.12, 0.9, 16).map(toS), YEL, 0.55)
      // cheek pads glow toward white when charged
      const cheek = mixc(ORANGE, WHITE_Y, f.cheek * 0.7)
      facet(ell(rg.hat(-0.66, -0.3), rg.hr, rg.hu, 0.23, 0.19, 8).map(toS), cheek, 0.2)
      facet(ell(rg.hat(0.66, -0.3), rg.hr, rg.hu, 0.23, 0.19, 8).map(toS), cheek, 0.2)
      // eyes and mouth are cut out, so the page shows through
      octx!.globalCompositeOperation = 'destination-out'
      const ery = Math.max(0.045, 0.22 * (1 - f.blink))
      poly(ell(rg.hat(-0.4, 0.1), rg.hr, rg.hu, 0.17, ery, 8).map(toS), WHITE)
      poly(ell(rg.hat(0.4, 0.1), rg.hr, rg.hu, 0.17, ery, 8).map(toS), WHITE)
      poly(ell(rg.hat(0, -0.27), rg.hr, rg.hu, 0.1, 0.04 + 0.13 * f.mouth, 8).map(toS), WHITE)
      octx!.globalCompositeOperation = 'source-over'
      if (f.blink < 0.5) {
        poly(ell(rg.hat(-0.45, 0.17), rg.hr, rg.hu, 0.06, 0.07, 6).map(toS), WHITE)
        poly(ell(rg.hat(0.35, 0.17), rg.hr, rg.hu, 0.06, 0.07, 6).map(toS), WHITE)
      }
    }

    // ---- rasterize and read back as glyph cells ----
    let bodyCenter: V = { x: 0, y: 0 }
    function rasterize(rig: Rig, f: Face, now: number): Cell[] {
      octx!.setTransform(1, 0, 0, 1, 0, 0)
      octx!.clearRect(0, 0, cols, rows)
      octx!.setTransform(1 / cw, 0, 0, 1 / chH, 0, 0)
      bx0 = by0 = Infinity
      bx1 = by1 = -Infinity
      drawTail(rig, f.orb)
      drawBody(rig)
      drawHead(rig, f, now)
      drawArm(rig.armL)
      drawArm(rig.armR)

      bodyCenter = toS(rig.at(0, 1.6))
      const pad = 0.5 * U
      const c0 = clamp(Math.floor((bx0 - pad) / cw), 0, cols - 1)
      const c1 = clamp(Math.ceil((bx1 + pad) / cw), 0, cols - 1)
      const r0 = clamp(Math.floor((by0 - pad) / chH), 0, rows - 1)
      const r1 = clamp(Math.ceil((by1 + pad) / chH), 0, rows - 1)
      const w = c1 - c0 + 1, h = r1 - r0 + 1
      if (w <= 1 || h <= 1) return []
      const data = octx!.getImageData(c0, r0, w, h).data
      const out: Cell[] = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const a = data[i + 3]
          if (a < 28) continue
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const cx = c0 + x, cy = r0 + y
          // yellow is bright in every facet, so stretch the usable range for shading
          let v = Math.pow(clamp(((Math.max(r, g, b) * a) / 255 - 75) / 175, 0, 1), 0.85)
          v += (hash(cx, cy) - 0.5) * 0.12
          const idx = clamp(Math.floor(v * RAMP.length), 1, RAMP.length - 1)
          const boost = clamp(245 / Math.max(r, g, b, 1), 1, 2)
          out.push({ cx, cy, ch: RAMP[idx], r: Math.min(255, r * boost), g: Math.min(255, g * boost), b: Math.min(255, b * boost), a: 0.72 + 0.28 * (a / 255) })
        }
      }
      return out
    }

    // ---- electric static on the glyphs ----
    function zapfx(cells: Cell[], g: number, now: number): Cell[] {
      if (g <= 0) return cells
      const tick = Math.floor(now * 30)
      const out: Cell[] = []
      for (const c of cells) {
        const rowHit = hash(c.cy >> 1, tick) > 1 - 0.4 * g
        const shift = rowHit ? Math.round((hash(c.cy >> 1, tick, 3) - 0.5) * 14 * g) : 0
        let n: Cell = { ...c, cx: c.cx + shift }
        if (hash(c.cx, c.cy, tick) < 0.3 * g) n.ch = pick(STATIC, hash(c.cy, c.cx, tick))
        if (hash(c.cx, c.cy, tick + 1) < 0.25 * g) n = { ...n, r: WHITE_Y[0], g: WHITE_Y[1], b: WHITE_Y[2] }
        out.push(n)
        if (hash(c.cx, c.cy, tick + 2) < 0.3 * g) out.push({ ...c, cx: c.cx + 3, r: YEL_HI[0], g: YEL_HI[1], b: YEL_HI[2], a: 0.45 * g })
        if (hash(c.cx, c.cy, tick + 4) < 0.22 * g) out.push({ ...c, cx: c.cx - 3, r: ORANGE[0], g: ORANGE[1], b: ORANGE[2], a: 0.4 * g })
      }
      return out
    }

    // ---- particles, reform ----
    let particles: Particle[] = []
    let reformPs: ReformP[] = []
    let reformStart = 0
    function spawnExplosion(cells: Cell[]) {
      const S = 5 * U
      for (const c of cells) {
        const x = c.cx * cw, y = c.cy * chH
        const dx = x - bodyCenter.x, dy = y - bodyCenter.y
        const d = Math.hypot(dx, dy) || 1
        const sp = (0.6 + rng() * 1.6) * S * (0.8 + d / S) * 1.5
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
    function spawnTrail(a: V, b: V) {
      for (let i = 0; i < 44; i++) {
        const s = rng()
        const max = 0.25 + rng() * 0.4
        particles.push({
          x: a.x + (b.x - a.x) * s + (rng() - 0.5) * U,
          y: a.y + (b.y - a.y) * s + (rng() - 0.5) * U,
          vx: (rng() - 0.5) * 40, vy: (rng() - 0.5) * 40,
          ch: pick('-=~*+', rng()), c: rng() < 0.5 ? YEL : YEL_HI, life: max, max,
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
    let cheekFlash = -1
    function jag(a: V, b: V, rough: number, depth: number): V[] {
      let pts = [a, b]
      let amp = Math.hypot(b.x - a.x, b.y - a.y) * rough
      for (let d = 0; d < depth; d++) {
        const nxt: V[] = [pts[0]]
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1]
          const dx = q.x - p.x, dy = q.y - p.y
          const l = Math.hypot(dx, dy) || 1
          const off = (rng() - 0.5) * 2 * amp
          nxt.push({ x: (p.x + q.x) / 2 + (-dy / l) * off, y: (p.y + q.y) / 2 + (dx / l) * off }, q)
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
    // Lightning comes out of the critter: mostly its cheeks, sometimes the
    // tail orb or an ear tip.
    function emitters(rig: Rig): V[] {
      const cl = toS(rig.hat(-0.66, -0.3)), cr = toS(rig.hat(0.66, -0.3))
      return [cl, cr, cl, cr, toS(rig.tail[rig.tail.length - 1]), toS(rig.earL.tip), toS(rig.earR.tip)]
    }
    function strike(rig: Rig, now: number, fromCorner: boolean) {
      const e = emitters(rig)
      const src = e[Math.floor(rng() * e.length)]
      // aim away from its body; from the corner, always back across the page
      const ang = fromCorner ? Math.PI * (0.85 + rng() * 0.6) : Math.atan2(src.y - bodyCenter.y, src.x - bodyCenter.x) + (rng() - 0.5) * 1.4
      const len = Math.max(W, H) * (0.45 + rng() * 0.7)
      spawnBolt(src, { x: src.x + Math.cos(ang) * len, y: src.y + Math.sin(ang) * len }, now, true, 0.42)
      cheekFlash = now
    }
    function crackle(rig: Rig, now: number) {
      const e = emitters(rig)
      const a = e[Math.floor(rng() * e.length)]
      const ang = rng() * Math.PI * 2
      const len = U * (0.6 + rng() * 1.6)
      spawnBolt(a, { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len }, now, false, 0.16)
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
              const x = p.x + (dx * s) / steps, y = p.y + (dy * s) / steps
              const cx = Math.round(x / bcw), cy = Math.round(y / bch)
              const key = cx * 100003 + cy
              if (seen.has(key)) continue
              seen.add(key)
              // soft yellow glow around the stroke
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
        const R = (0.2 + 1.6 * easeOut(k)) * 5 * U
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

    // ---- main step ----
    let lastSeg = -1
    let lastCells: Cell[] = []
    let explodeAt = -1
    let idleStart = -1
    let evKind: '' | 'spark' | 'wave' = ''
    let evStart = 0
    let nextEv = 0

    function centerOf(p: Perch, scale: number): V {
      const { A, up } = anchorOf(p)
      return { x: A.x + up.x * scale * 2, y: A.y + up.y * scale * 2 }
    }
    function faceFor(perch: Perch, t: number): Face {
      return {
        blink: blinkAt(t, perch.seed),
        mouth: 0,
        cheek: 0.1 + 0.15 * (hash(Math.floor(t * 8), 5) > 0.7 ? 1 : 0),
        wag: 0.16 * Math.sin(t * 2.6 + perch.seed) + 0.06 * Math.sin(t * 7.1),
        orb: 0.4 + 0.6 * (hash(Math.floor(t * 12), 8) > 0.5 ? 1 : 0),
      }
    }

    function enter(seg: Seg, now: number, t: number) {
      if (seg.name === 'in') {
        if (!perches[seg.hop]) perches[seg.hop] = choosePerch()
        if (seg.hop === 0) {
          // arrives on a lightning strike from the top of the screen
          const c = centerOf(perches[0], Up)
          spawnBolt({ x: c.x + (rng() - 0.5) * 200, y: -10 }, c, now, true, 0.45)
        }
      } else if (seg.name === 'zap') {
        perches[seg.hop + 1] = choosePerch()
        const a = centerOf(perches[seg.hop], Up), b = centerOf(perches[seg.hop + 1], Up)
        spawnBolt(a, b, now, true, 0.4)
        spawnTrail(a, b)
      } else if (seg.name === 'explode') {
        explodeAt = now
        spawnExplosion(lastCells)
        // overload: thunder bursts out in every direction
        const n = 7
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + rng() * 0.6
          const len = Math.max(W, H) * (0.3 + rng() * 0.4)
          spawnBolt(bodyCenter, { x: bodyCenter.x + Math.cos(ang) * len, y: bodyCenter.y + Math.sin(ang) * len }, now, true, 0.5)
        }
      } else if (seg.name === 'reform') {
        // rasterize the corner pose once to get the target glyphs
        const rig = build(animate(corner.pose, t, corner.seed), 0)
        setTransform(rig, corner, Uc, 1, 1, { x: 0, y: 0 })
        beginReform(rasterize(rig, { ...faceFor(corner, t), blink: 0 }, now), now)
      } else if (seg.name === 'idle') {
        idleStart = now
        reformPs = []
        nextStrike = now + 0.4
        nextEv = now + 2.5 + rng() * 2
      }
    }

    function step(now: number, dt: number, draw: boolean) {
      const t = now
      const { i, seg, k } = segAt(t)
      if (i !== lastSeg) {
        for (let j = lastSeg + 1; j <= i; j++) enter(SEGS[j], now, t)
        lastSeg = i
      }

      let cells: Cell[] = []
      let tint: RGB | undefined
      let perch: Perch | null = null
      let scale = Up
      if (seg.name === 'in' || seg.name === 'hold' || seg.name === 'out' || seg.name === 'charge') perch = perches[seg.hop]
      if (seg.name === 'idle') { perch = corner; scale = Uc }

      if (perch) {
        let pose = animate(perch.pose, t, perch.seed)
        const face = faceFor(perch, t)
        let sx = 1, sy = 1, lift = 0, fx = 0
        let shake = { x: 0, y: 0 }

        if (seg.name === 'in') {
          // drops in stretched, lands with a squash
          const land = 0.35
          if (k < land) { const q = k / land; sy = 1.35; lift = 2.2 * (1 - q * q); fx = 0.6 * (1 - q) }
          else { const q = (k - land) / (1 - land); sy = 1 - 0.6 * Math.sin(q * Math.PI) * (1 - q) }
          sx = 1 / Math.sqrt(sy)
        } else if (seg.name === 'out') {
          // crouch, then stretch into a streak and zip away
          if (k < 0.55) pose = lerpPose(pose, CROUCH, easeOut(k / 0.55))
          else {
            const q = (k - 0.55) / 0.45
            pose = CROUCH
            sy = 1 + 1.3 * easeIn(q)
            sx = 1 - 0.75 * easeIn(q)
            lift = q * q * 1.5
            fx = 0.7 * q
          }
        } else if (seg.name === 'charge') {
          pose = lerpPose(pose, CHARGE, easeOut(k * 3))
          const amp = 1 + 4 * k
          shake = { x: (rng() - 0.5) * amp, y: (rng() - 0.5) * amp * 0.5 }
          fx = 0.12 + 0.4 * k * k
          face.mouth = 1
          face.cheek = 1
          face.orb = 1
          if (k > 0.55 && hash(Math.floor(now * 20), 4) > 0.55) tint = WHITE_Y
        } else if (seg.name === 'idle') {
          if (!reduced && !evKind && now > nextEv) {
            evKind = rng() < 0.55 ? 'spark' : 'wave'
            evStart = now
          }
          if (evKind) {
            const ek = (now - evStart) / (evKind === 'wave' ? 1.8 : 0.7)
            if (ek >= 1) { evKind = ''; nextEv = now + 4 + rng() * 4 }
            else if (evKind === 'wave') pose = lerpPose(pose, animate(WAVE, t, corner.seed), clamp(Math.sin(ek * Math.PI) * 2.5, 0, 1))
            else { face.mouth = 0.8; face.cheek = 1; face.orb = 1 }
          }
        }

        if (cheekFlash >= 0) face.cheek = Math.max(face.cheek, 1 - (now - cheekFlash) / 0.3)
        const up = anchorOf(perch).up
        shake = { x: shake.x + up.x * lift * scale, y: shake.y + up.y * lift * scale }
        const rig = build(pose, face.wag)
        setTransform(rig, perch, scale, sx / Math.sqrt(pose.sq), sy * pose.sq, shake)
        cells = rasterize(rig, face, now)
        if (fx > 0) cells = zapfx(cells, fx, now)
        lastCells = cells

        // lightning out of it while it's solid on a perch or idling
        if (!reduced) {
          const solid = seg.name === 'hold' || seg.name === 'idle' || (seg.name === 'in' && k > 0.6)
          if (solid && now > nextStrike) {
            strike(rig, now, seg.name === 'idle')
            nextStrike = now + (seg.name === 'idle' ? 1.6 + rng() * 2.4 : 0.8 + rng() * 0.9)
          }
          const sparking = seg.name === 'charge' || (seg.name === 'idle' && evKind === 'spark')
          if ((solid || sparking) && now > nextCrackle) {
            crackle(rig, now)
            nextCrackle = now + (sparking ? 0.05 + rng() * 0.07 : 0.3 + rng() * 0.7)
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
      if (cells.length) drawCells(cells, tint ?? (idleStart >= 0 && now - idleStart < 0.12 ? WHITE_Y : undefined))
    }

    // ---- run ----
    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    if (debugT !== null || reduced) {
      // still frame: simulate to the target time, draw once
      const target = reduced ? 20 : (debugT as number)
      for (let tt = 0; tt < target; tt += 1 / 60) step(tt, 1 / 60, false)
      step(target, 1 / 60, true)
      return () => window.removeEventListener('resize', onResize)
    }

    let raf = 0
    let last = 0
    let clock = 0
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
      else if (!raf) { last = 0; raf = requestAnimationFrame(loop) }
    }
    document.addEventListener('visibilitychange', onVis)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Portaled to <body> so page-transition transforms can't break
  // position: fixed, and so it sits under the page content.
  return createPortal(<canvas ref={ref} className="runner-canvas" aria-hidden="true" />, document.body)
}
