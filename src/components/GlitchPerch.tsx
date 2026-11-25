import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Ambient ASCII character for the home page.
//
// An original, front-facing, angular character (shard crest, mint visor,
// sash, fluttering scarf). Each frame she is posed as a flat 2D skeleton,
// painted as low-poly shapes onto a tiny offscreen canvas with one pixel per
// text cell, and read back as monospace glyphs picked by brightness.
//
// Sequence (runs once): glitch onto a few headings / links on the page,
// perched on top of, hanging under, or clinging to the side of the text, then
// glitch out and zap to the next one along a pink lightning bolt. On the last
// perch she glitches harder and explodes into glyphs, the debris re-forms in
// the bottom-right corner, and she stays there idling. Pink lightning streaks
// across the screen throughout.

type V = { x: number; y: number }
type RGB = [number, number, number]

type Pose = {
  tilt: number // torso lean sideways (+ = right)
  head: number // head tilt relative to torso
  thL: number; shL: number; tlL: number // left thigh/shin angle (+ = outward), thigh length (foreshortening)
  thR: number; shR: number; tlR: number
  arL: number; elL: number // left upper arm (+ = outward from down), elbow (+ = outward)
  arR: number; elR: number
}

type Cell = { cx: number; cy: number; ch: string; r: number; g: number; b: number; a: number }
type Particle = { x: number; y: number; vx: number; vy: number; ch: string; c: RGB; life: number; max: number }
type ReformP = { sx: number; sy: number; tx: number; ty: number; ch: string; c: RGB; delay: number }
type Bolt = { id: number; paths: V[][]; born: number; life: number; strong: boolean }
type Side = 'top' | 'bottom' | 'left' | 'right' | 'corner'
type Perch = { el: Element | null; side: Side; t: number; tilt: number; pose: Pose; mirror: boolean; seed: number }

const RAMP = ' .:-=+*#%@'
const GLITCH = '!<>/\\[]{}=+*^?#01'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const PINK_HI = hex('#ff7aa8')
const PINK = hex('#ff3d7f')
const PINK_MID = hex('#e8306f')
const PINK_LO = hex('#a51d52')
const PINK_SH = hex('#7d1a45')
const MINT_HI = hex('#8dffdc')
const MINT = hex('#35e6ae')
const MINT_LO = hex('#1d8f6b')
const WHITE_PINK: RGB = [255, 226, 238]

// skeleton, units where a standing figure is about 8 tall
const THIGH = 1.6
const SHIN = 1.5
const TORSO = 2.55
const NECK = 0.28
const HEADR = 0.66
const UARM = 1.35
const FARM = 1.25
const SCARF_N = 7
const SCARF_SEG = 0.45

// ---- poses (front view) ----
const CROUCH: Pose = { tilt: 0.04, head: -0.14, thL: 1.2, shL: -0.25, tlL: 0.62, thR: 1.15, shR: -0.2, tlR: 0.6, arL: 0.35, elL: -0.55, arR: 0.75, elR: -1.5 }
const KNEEL: Pose = { tilt: -0.06, head: 0.12, thL: 0.55, shL: -0.05, tlL: 0.9, thR: 1.4, shR: -0.65, tlR: 0.55, arL: 0.2, elL: 0.15, arR: 0.95, elR: -1.25 }
const PERCH_LOW: Pose = { tilt: 0.0, head: -0.05, thL: 1.35, shL: -0.4, tlL: 0.5, thR: 1.35, shR: -0.4, tlR: 0.5, arL: 0.15, elL: -0.1, arR: 0.15, elR: -0.1 }
const POSES = [CROUCH, KNEEL, PERCH_LOW]


// ---- timeline ----
type SegName = 'wait' | 'in' | 'hold' | 'out' | 'zap' | 'glitch' | 'explode' | 'reform' | 'idle'
type Seg = { name: SegName; dur: number; hop: number }
const HOPS = 4
const SEGS: Seg[] = (() => {
  const s: Seg[] = [{ name: 'wait', dur: 0.6, hop: -1 }]
  for (let i = 0; i < HOPS; i++) {
    s.push({ name: 'in', dur: 0.42, hop: i }, { name: 'hold', dur: 1.2, hop: i })
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

// ---- helpers ----
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
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

// ---- forward kinematics (rig space: y up, pelvis at origin) ----
function fk(p: Pose) {
  const P: V = { x: 0, y: 0 }
  const u = upv(p.tilt)
  const r = { x: u.y, y: -u.x }
  const neck = add(P, u, TORSO)
  const shC = add(P, u, TORSO - 0.32)
  const shL = add(shC, r, -0.62)
  const shR = add(shC, r, 0.62)
  const hipL = add(P, r, -0.42)
  const hipR = add(P, r, 0.42)
  const leg = (hip: V, side: number, th: number, sh: number, tl: number) => {
    const knee = add(hip, dirv(side * th), THIGH * tl)
    const ankle = add(knee, dirv(side * sh), SHIN)
    const toe = add(ankle, { x: side * 0.3, y: -0.3 }, 1)
    return { hip, knee, ankle, toe }
  }
  const arm = (sh: V, side: number, ar: number, el: number) => {
    const a = side * ar + p.tilt
    const elbow = add(sh, dirv(a), UARM)
    const fa = a + side * el
    const hand = add(elbow, dirv(fa), FARM)
    return { sh, elbow, hand, fa, side }
  }
  const ha = p.tilt + p.head
  const head = add(neck, upv(ha), NECK + HEADR)
  const legL = leg(hipL, -1, p.thL, p.shL, p.tlL)
  const legR = leg(hipR, 1, p.thR, p.shR, p.tlR)
  const foot = Math.min(legL.ankle.y, legL.toe.y, legR.ankle.y, legR.toe.y)
  return { P, u, r, neck, head, ha, legL, legR, armL: arm(shL, -1, p.arL, p.elL), armR: arm(shR, 1, p.arR, p.elR), foot }
}
type Rig = ReturnType<typeof fk>

function idlePose(base: Pose, t: number, seed: number): Pose {
  const o = { ...base }
  const br = Math.sin(t * 2.1 + seed)
  o.tilt += 0.05 * Math.sin(t * 0.6 + seed)
  o.head += 0.16 * Math.sin(t * 0.45 + seed * 2) + 0.06 * Math.sin(t * 1.7 + seed)
  o.tlL += 0.03 * br
  o.tlR += 0.03 * br
  o.arL += 0.05 * Math.sin(t * 1.3 + seed)
  o.arR += 0.05 * Math.sin(t * 1.1 + seed + 1)
  return o
}

function mirrorPose(p: Pose): Pose {
  return { tilt: -p.tilt, head: -p.head, thL: p.thR, shL: p.shR, tlL: p.tlR, thR: p.thL, shR: p.shL, tlR: p.tlL, arL: p.arR, elL: p.elR, arR: p.arL, elR: p.elL }
}

export default function GlitchPerch() {
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
    let Up = 12, Uc = 25 // perched / corner scale (px per rig unit)

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
      Up = (mobile ? 96 : clamp(H * 0.2, 130, 175)) / 8
      Uc = (mobile ? clamp(H * 0.2, 110, 150) : clamp(H * 0.32, 160, 270)) / 8
    }
    resize()

    // ---- perch selection ----
    const used = new Set<Element>()
    const perches: Perch[] = []
    const corner: Perch = { el: null, side: 'corner', t: 0, tilt: 0, pose: CROUCH, mirror: true, seed: 3.1 }

    function choosePerch(): Perch {
      const sel = 'main.site h1, main.site h2, main.site a.name, main.site .tip, main.site .intro, main.site .links a, main.site .avatar'
      const charH = 7.5 * Up
      const vis = Array.from(document.querySelectorAll(sel)).filter(e => {
        const r = e.getBoundingClientRect()
        return r.width > 20 && r.top > 80 && r.bottom < H - 30 && !used.has(e)
      })
      const pose = POSES[Math.floor(rng() * POSES.length)]
      const mirror = rng() < 0.5
      const seed = rng() * 10
      const tilt = (rng() - 0.5) * 0.3
      if (!vis.length) {
        return { el: null, side: 'top', t: rng(), tilt, pose, mirror, seed }
      }
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
      const roomL = r.left > 4 * Up
      const roomR = W - r.right > 4 * Up
      if (roll < 0.3 && (roomL || roomR)) side = roomR && (!roomL || rng() < 0.5) ? 'right' : 'left'
      else if (roll < 0.55 || r.top - charH < 70) side = 'bottom'
      return { el, side, t: 0.15 + 0.7 * rng(), tilt, pose, mirror, seed }
    }

    // where the feet go, and which way is "up" for her body
    function anchorOf(p: Perch): { A: V; up: V } {
      if (p.side === 'corner') return { A: { x: W - 3.3 * Uc - 22, y: H - 4 }, up: { x: 0, y: -1 } }
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

    function facet(pts: V[], base: RGB, contrast = 0.4) {
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
        const f = 1.05 - contrast * 0.5 + contrast * 0.5 * d
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

    function drawLeg(l: Rig['legL'], side: number) {
      limb(l.hip, l.knee, 0.34, 0.25, PINK_LO)
      limb(l.knee, l.ankle, 0.25, 0.16, PINK_MID)
      // mint knee guard
      facet([add(l.knee, { x: 0, y: 1 }, 0.26), add(l.knee, { x: 1, y: 0 }, 0.22), add(l.knee, { x: 0, y: -1 }, 0.3), add(l.knee, { x: -1, y: 0 }, 0.22)].map(toS), MINT)
      // boot
      facet([add(l.ankle, { x: -side, y: 0 }, 0.17), add(l.ankle, { x: side, y: 0.1 }, 0.2), l.toe, add(l.ankle, { x: -side * 0.1, y: -0.32 }, 1)].map(toS), PINK_SH)
    }

    function drawArm(a: Rig['armL']) {
      const s = a.side
      // angular shoulder plate
      facet([add(a.sh, { x: s * 0.3, y: 0.22 }, 1), add(a.sh, { x: -s * 0.05, y: 0.28 }, 1), add(a.sh, { x: -s * 0.12, y: -0.1 }, 1), add(a.sh, { x: s * 0.42, y: -0.28 }, 1)].map(toS), PINK_HI)
      limb(a.sh, a.elbow, 0.19, 0.14, PINK_HI)
      limb(a.elbow, a.hand, 0.14, 0.1, PINK_SH)
      const d = dirv(a.fa)
      const n = { x: -d.y, y: d.x }
      facet([add(a.hand, n, 0.13), add(add(a.hand, d, 0.34), n, 0.03), add(a.hand, n, -0.13)].map(toS), PINK_LO)
    }

    function drawTorso(r: Rig) {
      const at = (fw: number, h: number) => add(add(r.P, r.r, fw), r.u, h)
      facet([at(-0.55, -0.28), at(0.55, -0.28), at(0.5, 0.45), at(-0.5, 0.45)].map(toS), PINK_LO)
      facet([at(-0.5, 0.3), at(0.5, 0.3), at(0.36, 1.0), at(0.62, 1.9), at(0.66, 2.3), at(0.2, 2.62), at(-0.2, 2.62), at(-0.66, 2.3), at(-0.62, 1.9), at(-0.36, 1.0)].map(toS), PINK_MID)
      poly([at(-0.66, 2.18), at(-0.42, 2.34), at(0.52, 0.66), at(0.3, 0.52)].map(toS), MINT) // sash
      poly([at(-0.5, 0.42), at(0.5, 0.42), at(0.47, 0.6), at(-0.47, 0.6)].map(toS), MINT_LO) // belt
      facet([at(-0.4, 2.4), at(0.4, 2.4), at(0.3, 2.9), at(-0.3, 2.9)].map(toS), PINK_LO) // high collar
    }

    function drawHead(r: Rig, scan: number, twitch: number) {
      const hu = upv(r.ha)
      const hr = { x: hu.y, y: -hu.x }
      const at = (x: number, y: number) => add(add(r.head, hr, x * HEADR), hu, y * HEADR)
      // shard crest
      facet([at(-0.32, 0.82), at(-0.8 - twitch, 2.05), at(-0.04, 1.0)].map(toS), PINK)
      facet([at(-0.1, 1.0), at(0.12 + twitch * 0.5, 2.6), at(0.34, 0.95)].map(toS), PINK_HI)
      facet([at(0.3, 0.82), at(0.98 + twitch, 1.85), at(0.58, 0.62)].map(toS), PINK)
      // ear fins
      facet([at(-0.78, 0.25), at(-1.28, 0.6), at(-0.82, -0.18)].map(toS), MINT)
      facet([at(0.78, 0.25), at(1.28, 0.6), at(0.82, -0.18)].map(toS), MINT)
      // face
      facet([at(0, 1.05), at(-0.72, 0.62), at(-0.84, -0.05), at(-0.45, -0.72), at(0, -1.02), at(0.45, -0.72), at(0.84, -0.05), at(0.72, 0.62)].map(toS), PINK_HI, 0.45)
      // visor with a sweeping scan highlight
      poly([at(-0.88, 0.4), at(0.88, 0.4), at(0.8, 0.02), at(-0.8, 0.02)].map(toS), MINT_HI)
      poly([at(-0.62, 0.26), at(0.62, 0.26), at(0.6, 0.15), at(-0.6, 0.15)].map(toS), MINT_LO)
      const x0 = -0.75 + 1.5 * scan
      poly([at(x0 - 0.1, 0.38), at(x0 + 0.1, 0.38), at(x0 + 0.08, 0.04), at(x0 - 0.12, 0.04)].map(toS), [255, 255, 255])
    }

    // ---- scarf (verlet chain) ----
    const scarf: { x: number; y: number; px: number; py: number }[] = []
    let scarfReset = true
    function scarfAnchor(r: Rig): { a: V; rest: V } {
      const a = toS(add(add(r.P, r.r, 0.32), r.u, 2.6))
      const t = toS(add(add(r.P, r.r, 1.4), r.u, 2.2))
      const l = Math.hypot(t.x - a.x, t.y - a.y) || 1
      return { a, rest: { x: (t.x - a.x) / l, y: (t.y - a.y) / l } }
    }
    function stepScarf(r: Rig, dt: number, now: number) {
      const { a, rest } = scarfAnchor(r)
      const seg = SCARF_SEG * U
      if (scarfReset || scarf.length !== SCARF_N) {
        scarf.length = 0
        for (let i = 0; i < SCARF_N; i++) {
          const x = a.x + rest.x * seg * i, y = a.y + rest.y * seg * i
          scarf.push({ x, y, px: x, py: y })
        }
        scarfReset = false
        return
      }
      scarf[0].x = scarf[0].px = a.x
      scarf[0].y = scarf[0].py = a.y
      const g = 18 * U
      for (let i = 1; i < SCARF_N; i++) {
        const h = scarf[i]
        const vx = (h.x - h.px) * 0.9, vy = (h.y - h.py) * 0.9
        h.px = h.x
        h.py = h.y
        const k = 60 * (1 - i / SCARF_N) ** 1.4
        const wind = (Math.sin(now * 3.1 + i * 0.9) + 0.6 * Math.sin(now * 5.3 + i * 1.7)) * 26 * U
        h.x += vx + ((a.x + rest.x * seg * i - h.x) * k + wind) * dt * dt
        h.y += vy + ((a.y + rest.y * seg * i - h.y) * k + g) * dt * dt
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < SCARF_N; i++) {
          const p = scarf[i - 1], h = scarf[i]
          const dx = h.x - p.x, dy = h.y - p.y
          const m = seg / (Math.hypot(dx, dy) || 1)
          h.x = p.x + dx * m
          h.y = p.y + dy * m
        }
      }
    }
    function drawScarf() {
      for (let i = 0; i < scarf.length - 1; i++) {
        const p = scarf[i], q = scarf[i + 1]
        const dx = q.x - p.x, dy = q.y - p.y
        const l = Math.hypot(dx, dy) || 1
        const n = { x: -dy / l, y: dx / l }
        const w0 = (0.26 - 0.025 * i) * U, w1 = (0.26 - 0.025 * (i + 1)) * U
        facet([add(p, n, w0), add(q, n, w1), add(q, n, -w1), add(p, n, -w0)], i % 2 ? MINT : MINT_LO, 0.5)
        if (i === scarf.length - 2) facet([add(q, n, w1), add(q, { x: dx / l, y: dy / l }, 0.6 * U), add(q, n, -w1)], MINT_HI)
      }
    }

    // ---- rasterize and read back as glyph cells ----
    let bodyCenter: V = { x: 0, y: 0 }
    function rasterize(rig: Rig, scan: number, twitch: number): Cell[] {
      octx!.setTransform(1, 0, 0, 1, 0, 0)
      octx!.clearRect(0, 0, cols, rows)
      octx!.setTransform(1 / cw, 0, 0, 1 / chH, 0, 0)
      drawScarf()
      drawLeg(rig.legL, -1)
      drawLeg(rig.legR, 1)
      drawTorso(rig)
      drawHead(rig, scan, twitch)
      drawArm(rig.armL)
      drawArm(rig.armR)

      const hu = upv(rig.ha)
      const pts = [rig.legL.toe, rig.legR.toe, rig.legL.knee, rig.legR.knee, rig.armL.hand, rig.armR.hand, rig.armL.elbow, rig.armR.elbow, add(rig.head, hu, 2.7 * HEADR), rig.P].map(toS)
      for (const s of scarf) pts.push(s)
      const pad = 1.6 * U
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
      const c0 = clamp(Math.floor((x0 - pad) / cw), 0, cols - 1)
      const c1 = clamp(Math.ceil((x1 + pad) / cw), 0, cols - 1)
      const r0 = clamp(Math.floor((y0 - pad) / chH), 0, rows - 1)
      const r1 = clamp(Math.ceil((y1 + pad) / chH), 0, rows - 1)
      const w = c1 - c0 + 1, h = r1 - r0 + 1
      bodyCenter = toS(add(rig.P, rig.u, 1.3))
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
          let v = Math.pow((Math.max(r, g, b) / 255) * (a / 255), 0.65)
          v += (hash(cx, cy) - 0.5) * 0.12
          const idx = clamp(Math.floor(v * RAMP.length), 1, RAMP.length - 1)
          const boost = clamp(245 / Math.max(r, g, b, 1), 1, 2)
          out.push({ cx, cy, ch: RAMP[idx], r: Math.min(255, r * boost), g: Math.min(255, g * boost), b: Math.min(255, b * boost), a: 0.72 + 0.28 * (a / 255) })
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
          if (hash(c.cx, c.cy, tick) < 0.06) out.push({ ...c, ch: '.', r: PINK[0], g: PINK[1], b: PINK[2], a: 0.5 })
        } else if (rel > front) {
          out.push({ ...c, ch: pick(GLITCH, hash(c.cx, c.cy, tick)), r: MINT_HI[0], g: MINT_HI[1], b: MINT_HI[2], a: 1 })
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
        if (hash(c.cx, c.cy, tick) < 0.3 * g) n.ch = pick(GLITCH, hash(c.cy, c.cx, tick))
        if (hash(c.cx, c.cy, tick + 1) < 0.2 * g) n = { ...n, r: MINT_HI[0], g: MINT_HI[1], b: MINT_HI[2] }
        out.push(n)
        if (hash(c.cx, c.cy, tick + 2) < 0.35 * g) out.push({ ...c, cx: c.cx + 3, r: PINK[0], g: PINK[1], b: PINK[2], a: 0.45 * g })
        if (hash(c.cx, c.cy, tick + 4) < 0.25 * g) out.push({ ...c, cx: c.cx - 3, r: MINT[0], g: MINT[1], b: MINT[2], a: 0.4 * g })
      }
      return out
    }

    // ---- particles, reform ----
    let particles: Particle[] = []
    let reformPs: ReformP[] = []
    let reformStart = 0
    function spawnExplosion(cells: Cell[]) {
      const S = 8 * U
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
        if (rng() < dt * 10) p.ch = pick(GLITCH + '-=+*#', rng())
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
    let nextAmbient = 1.2
    let nextSpark = 0
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
    function ambientBolt(now: number) {
      const vertical = rng() < 0.25
      if (vertical) {
        const x0 = rng() * W
        spawnBolt({ x: x0, y: -10 }, { x: x0 + (rng() - 0.5) * W * 0.4, y: H * (0.4 + rng() * 0.6) }, now, false)
      } else {
        const y0 = H * (0.05 + rng() * 0.9)
        const ltr = rng() < 0.5
        const len = W * (0.45 + rng() * 0.6)
        const xs = ltr ? -10 : W + 10
        spawnBolt({ x: xs, y: y0 }, { x: xs + (ltr ? len : -len), y: y0 + (rng() - 0.5) * H * 0.35 }, now, false)
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
              const x = p.x + (dx * s) / steps, y = p.y + (dy * s) / steps
              const cx = Math.round(x / bcw), cy = Math.round(y / bch)
              const key = cx * 100003 + cy
              if (seen.has(key)) continue
              seen.add(key)
              // soft pink glow around the stroke
              ctx!.fillStyle = style(PINK[0], PINK[1], PINK[2], core * 0.3)
              ctx!.fillText('·', cx * bcw, (cy - 1) * bch)
              ctx!.fillText('·', cx * bcw, (cy + 1) * bch)
              const c = b.strong || hash(cx, cy, b.id) > 0.45 ? WHITE_PINK : PINK_HI
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
        let c = mixc(p.c, MINT, clamp(t * 1.6, 0, 1))
        let a = Math.pow(p.life / p.max, 0.7)
        if (flash) { c = WHITE_PINK; a = 1 }
        ctx!.fillStyle = style(c[0], c[1], c[2], a)
        ctx!.fillText(flash ? '@' : p.ch, Math.round(p.x / cw) * cw, Math.round(p.y / chH) * chH)
      }
      if (explodeAt >= 0 && now - explodeAt < 0.5) {
        const k = (now - explodeAt) / 0.5
        const R = (0.2 + 1.5 * easeOut(k)) * 8 * U
        const steps = Math.ceil((2 * Math.PI * R) / (cw * 1.6))
        ctx!.fillStyle = style(PINK_HI[0], PINK_HI[1], PINK_HI[2], (1 - k) * 0.85)
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
        const c = mixc(MINT_HI, p.c, k)
        ctx!.fillStyle = style(c[0], c[1], c[2], 0.35 + 0.65 * k)
        ctx!.fillText(k < 0.85 ? pick(GLITCH, rng()) : p.ch, Math.round(x / cw) * cw, Math.round(y / chH) * chH)
      }
    }

    // ---- main step ----
    let lastSeg = -1
    let lastCells: Cell[] = []
    let explodeAt = -1
    let idleStart = -1
    let nextMicro = 0

    function centerOf(p: Perch, scale: number): V {
      const { A, up } = anchorOf(p)
      return { x: A.x + up.x * scale * 3.6, y: A.y + up.y * scale * 3.6 }
    }

    function poseFor(perch: Perch, t: number) {
      const base = perch.mirror ? mirrorPose(perch.pose) : perch.pose
      return idlePose(base, t, perch.seed)
    }

    function enter(seg: Seg, now: number, t: number) {
      if (seg.name === 'in') {
        if (!perches[seg.hop]) perches[seg.hop] = choosePerch()
        scarfReset = true
      } else if (seg.name === 'zap') {
        perches[seg.hop + 1] = choosePerch()
        spawnBolt(centerOf(perches[seg.hop], Up), centerOf(perches[seg.hop + 1], Up), now, true, 0.38)
      } else if (seg.name === 'explode') {
        explodeAt = now
        spawnExplosion(lastCells)
        spawnBolt(bodyCenter, { x: bodyCenter.x + (rng() - 0.5) * W * 0.6, y: -10 }, now, true, 0.4)
      } else if (seg.name === 'reform') {
        // rasterize the corner pose once to get the target glyphs
        const rig = fk(poseFor(corner, t))
        setTransform(rig, corner, Uc, 1, 1, { x: 0, y: 0 })
        scarfReset = true
        stepScarf(rig, 1 / 60, now)
        beginReform(rasterize(rig, 0.5, 0), now)
      } else if (seg.name === 'idle') {
        idleStart = now
        reformPs = []
        nextSpark = now + 0.2
        nextMicro = now + 3 + rng() * 3
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
      let perch: Perch | null = null
      let scale = Up
      if (seg.name === 'in' || seg.name === 'hold' || seg.name === 'out' || seg.name === 'glitch') perch = perches[seg.hop]
      if (seg.name === 'idle') { perch = corner; scale = Uc }

      if (perch) {
        let sx = 1, sy = 1
        let shake = { x: 0, y: 0 }
        if (seg.name === 'in') { sx = 0.15 + 0.85 * easeOut(k * 1.8); sy = 1.3 - 0.3 * easeOut(k * 1.8) }
        if (seg.name === 'out') { sx = 1 - 0.92 * easeIn(k); sy = 1 + 0.4 * easeIn(k) }
        if (seg.name === 'glitch') shake = { x: (rng() - 0.5) * 6 * k, y: (rng() - 0.5) * 3 * k }
        const rig = fk(poseFor(perch, t))
        setTransform(rig, perch, scale, sx, sy, shake)
        stepScarf(rig, dt, now)
        const scan = (Math.sin(now * 1.6 + perch.seed) + 1) / 2
        const twitch = seg.name === 'idle' && hash(Math.floor(now * 4), 9) > 0.92 ? 0.25 : 0
        cells = rasterize(rig, scan, twitch)
        if (seg.name === 'in') cells = glitch(materialize(cells, k, now), (1 - k) * 0.8, now)
        else if (seg.name === 'out') cells = glitch(cells, 0.4 + 0.6 * k, now)
        else if (seg.name === 'glitch') cells = glitch(cells, 0.3 + 0.7 * k, now)
        else if (seg.name === 'idle') {
          if (now > nextMicro) {
            if (now > nextMicro + 0.18) nextMicro = now + 3.5 + rng() * 4
            else cells = glitch(cells, 0.55, now)
          }
        }
        lastCells = cells
      }

      // lightning
      if (!reduced) {
        if (now > nextAmbient) {
          ambientBolt(now)
          nextAmbient = now + 1.6 + rng() * 3.2
        }
        if (seg.name === 'idle' && now > nextSpark) {
          const top = toS(add(fk(poseFor(corner, t)).head, { x: 0, y: 1 }, 2.4 * HEADR))
          const ang = -Math.PI / 2 + (rng() - 0.5) * 2.2
          const len = (0.6 + rng() * 0.8) * 8 * Uc
          spawnBolt(top, { x: top.x + Math.cos(ang) * len, y: top.y + Math.sin(ang) * len }, now, false, 0.2)
          nextSpark = now + 2.4 + rng() * 3.5
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
      if (cells.length) drawCells(cells, idleStart >= 0 && now - idleStart < 0.12 ? WHITE_PINK : undefined)
    }

    // ---- run ----
    const onResize = () => { resize(); scarfReset = true }
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
