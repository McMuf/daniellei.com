import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Ambient ASCII runner for the home page.
//
// An original character (visor, long shard ponytail, cropped jacket) built
// from a 2D skeleton. Each frame the skeleton is posed, its limbs, torso,
// head and hair are painted as faceted low-poly shapes onto a tiny offscreen
// canvas with one pixel per text cell, and that canvas is read back and
// re-drawn as monospace glyphs picked by brightness. The hair is a small
// verlet chain, so it streams behind her when she runs and whips during flips.
//
// Loop: materialize -> ready stance -> sprint across the screen -> plant,
// crouch, front-flip jump -> three-point landing -> stand -> glitch ->
// explode into glyph particles -> vanish. The next loop runs the other way.

type V = { x: number; y: number }
type RGB = [number, number, number]

type Pose = {
  lean: number // torso, radians forward from vertical
  head: number // head tilt relative to torso (+ = chin down)
  thF: number // near thigh, radians forward from straight down
  knF: number // near knee bend (>= 0)
  thB: number // far thigh
  knB: number
  arF: number // near upper arm, relative to torso, forward from down
  elF: number // near elbow bend (>= 0, forward)
  arB: number
  elB: number
}

type Cell = { cx: number; cy: number; ch: string; r: number; g: number; b: number; a: number }

type Particle = {
  x: number; y: number; vx: number; vy: number
  ch: string; c: RGB; life: number; max: number; kind: 'body' | 'dust'
}

const RAMP = ' .:-=+*#%@'
const GLITCH = '!<>/\\[]{}=+*^?#01'
const DUST = '.,`\''
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

// Palette: hot pink body, mint accents (the site's green).
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const PINK_HI = hex('#ff7aa8')
const PINK = hex('#ff3d7f')
const PINK_MID = hex('#e0286a')
const PINK_LO = hex('#9c1a4c')
const PINK_SH = hex('#7d1a45')
const MINT_HI = hex('#8dffdc')
const MINT = hex('#35e6ae')
const MINT_LO = hex('#1d8f6b')
const MINT_SH = hex('#168064')

// Skeleton, in units where standing height is about 8.
const THIGH = 1.95
const SHIN = 1.95
const FOOT = 0.6
const TORSO = 2.55
const NECK = 0.28
const HEADR = 0.55
const UARM = 1.35
const FARM = 1.25
const HAIR_N = 8
const HAIR_SEG = 0.5
const GHOST_LIFE = 0.16

// ---- poses ----
const STAND: Pose = { lean: 0.04, head: 0, thF: 0.1, knF: 0.12, thB: -0.08, knB: 0.1, arF: -0.08, elF: 0.3, arB: 0.12, elB: 0.25 }
const READY: Pose = { lean: 0.2, head: -0.15, thF: 0.55, knF: 0.8, thB: -0.18, knB: 0.6, arF: 0.55, elF: 1.5, arB: -0.45, elB: 0.9 }
const CROUCH: Pose = { lean: 0.8, head: -0.55, thF: 1.4, knF: 2.2, thB: 1.15, knB: 2.25, arF: -1.3, elF: 0.25, arB: -1.5, elB: 0.2 }
const TAKEOFF: Pose = { lean: 0.08, head: -0.2, thF: 0.12, knF: 0.05, thB: -0.25, knB: 0.2, arF: 2.9, elF: 0.15, arB: 2.6, elB: 0.25 }
const TUCK: Pose = { lean: 0.65, head: 0.45, thF: 2.25, knF: 2.55, thB: 2.05, knB: 2.6, arF: 1.0, elF: 1.7, arB: 0.85, elB: 1.8 }
const OPEN: Pose = { lean: 0.25, head: -0.1, thF: 0.75, knF: 0.7, thB: 0.15, knB: 0.5, arF: 1.7, elF: 0.3, arB: -1.5, elB: 0.25 }
const HERO: Pose = { lean: 0.95, head: -0.8, thF: 1.35, knF: 2.3, thB: 0.12, knB: 1.65, arF: -0.62, elF: 0.12, arB: -2.1, elB: 0.35 }
const COOL: Pose = { lean: 0.02, head: -0.06, thF: 0.16, knF: 0.1, thB: -0.12, knB: 0.14, arF: -0.05, elF: 0.4, arB: 0.2, elB: 0.5 }

function runPose(p: number): Pose {
  const leg = (phi: number) => {
    const s = Math.sin(2 * Math.PI * phi)
    const c = Math.max(0, Math.cos(2 * Math.PI * (phi + 0.06)))
    return { th: 0.2 + 0.82 * s, kn: 0.35 + 1.8 * c * c }
  }
  const f = leg(p)
  const b = leg(p + 0.5)
  const sF = Math.sin(2 * Math.PI * p)
  return {
    lean: 0.34 + 0.03 * Math.sin(4 * Math.PI * p),
    head: -0.24,
    thF: f.th, knF: f.kn, thB: b.th, knB: b.kn,
    arF: 0.15 - 0.95 * sF, elF: 1.5 - 0.3 * sF,
    arB: 0.15 + 0.95 * sF, elB: 1.5 + 0.3 * sF,
  }
}

const KEYS = Object.keys(STAND) as (keyof Pose)[]
function mixPose(a: Pose, b: Pose, t: number): Pose {
  const o = {} as Pose
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t
  return o
}

// ---- math helpers ----
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const smooth = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t) }
const easeOut = (t: number) => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) }
const easeIn = (t: number) => { t = clamp(t, 0, 1); return t * t }
const down = (a: number): V => ({ x: Math.sin(a), y: -Math.cos(a) })
const upv = (a: number): V => ({ x: Math.sin(a), y: Math.cos(a) })
const add = (a: V, d: V, s: number): V => ({ x: a.x + d.x * s, y: a.y + d.y * s })
function hash(x: number, y: number, z = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
const pick = (s: string, r: number) => s[Math.floor(r * s.length) % s.length]
const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// ---- forward kinematics (rig space: y up, facing +x, pelvis at origin) ----
function fk(p: Pose) {
  const pelvis: V = { x: 0, y: 0 }
  const axis = upv(p.lean)
  const neck = add(pelvis, axis, TORSO)
  const shoulder = add(pelvis, axis, TORSO - 0.32)
  const ha = p.lean + p.head
  const head = add(neck, upv(ha), NECK + HEADR)
  const leg = (th: number, kn: number) => {
    const knee = add(pelvis, down(th), THIGH)
    const sa = th - kn
    const ankle = add(knee, down(sa), SHIN)
    const toe = add(ankle, { x: Math.cos(sa), y: Math.sin(sa) }, FOOT)
    return { knee, ankle, toe, sa }
  }
  const arm = (ar: number, el: number) => {
    const elbow = add(shoulder, down(p.lean + ar), UARM)
    const hand = add(elbow, down(p.lean + ar + el), FARM)
    return { elbow, hand }
  }
  return { pelvis, neck, shoulder, head, ha, lean: p.lean, legF: leg(p.thF, p.knF), legB: leg(p.thB, p.knB), armF: arm(p.arF, p.elF), armB: arm(p.arB, p.elB) }
}
type Rig = ReturnType<typeof fk>

// height the pelvis must sit at so the lowest foot/knee touches the ground
function groundLift(r: Rig) {
  const ys = [r.legF.ankle.y, r.legF.toe.y, r.legB.ankle.y, r.legB.toe.y, r.legF.knee.y, r.legB.knee.y]
  return -Math.min(...ys) + 0.1
}

// ---- choreography ----
const T = {
  appear: 1.0, ready: 0.55, acc: 0.4, plant: 0.22, crouch: 0.14, takeoff: 0.12,
  air: 1.0, land: 0.14, hero: 0.65, rise: 0.4, stand: 0.3, glitch: 0.5, explode: 1.7, gap: 0.8,
}
type Phase = 'appear' | 'ready' | 'acc' | 'cruise' | 'plant' | 'crouch' | 'takeoff' | 'air' | 'land' | 'hero' | 'rise' | 'stand' | 'glitch' | 'explode' | 'gap'

type Frame = {
  phase: Phase
  k: number // progress 0..1 within phase
  pose: Pose
  x: number // pelvis screen x
  dir: 1 | -1
  rot: number // body rotation (flip), radians
  arc: number // extra height above ground, rig units
  stride: number // run phase, for footstep dust
  visible: boolean
}

type Layout = { W: number; H: number; U: number; ground: number; fs: number; cw: number; chH: number }

function plan(L: Layout, dir: 1 | -1) {
  const v = 2.1 * 8 * L.U // px / s
  const x0 = dir > 0 ? L.W * 0.12 : L.W * 0.88
  const xPlant = dir > 0 ? L.W * 0.7 : L.W * 0.3
  const dAcc = (v * T.acc) / 2
  const cruise = Math.max(Math.abs(xPlant - x0) - dAcc, v * 0.4)
  const segs: [Phase, number][] = [
    ['appear', T.appear], ['ready', T.ready], ['acc', T.acc], ['cruise', cruise / v], ['plant', T.plant],
    ['crouch', T.crouch], ['takeoff', T.takeoff], ['air', T.air], ['land', T.land], ['hero', T.hero],
    ['rise', T.rise], ['stand', T.stand], ['glitch', T.glitch], ['explode', T.explode], ['gap', T.gap],
  ]
  const total = segs.reduce((s, [, d]) => s + d, 0)
  return { v, x0, dAcc, cruise, segs, total, strideLen: 10 * L.U }
}

function frameAt(L: Layout, dir: 1 | -1, t: number): Frame {
  const P = plan(L, dir)
  let acc = 0
  let phase: Phase = 'gap'
  let local = 0
  let dur = 1
  for (const [name, d] of P.segs) {
    if (t < acc + d) { phase = name; local = t - acc; dur = d; break }
    acc += d
  }
  if (t >= P.total) { phase = 'gap'; local = 0; dur = 1 }
  const k = clamp(local / dur, 0, 1)
  const dPlant = (P.v * T.plant) / 2
  const airDist = 3.2 * L.U
  let dist = 0 // distance travelled from x0
  let pose = STAND
  let rot = 0
  let arc = 0
  let stride = 0
  const strideAt = (d: number) => d / P.strideLen + 0.1
  const breath = Math.sin(t * 3) * 0.02

  switch (phase) {
    case 'appear':
      pose = { ...STAND, lean: STAND.lean + breath }
      break
    case 'ready':
      pose = mixPose(STAND, READY, smooth(k))
      break
    case 'acc': {
      dist = (P.v * local * local) / (2 * T.acc)
      stride = strideAt(dist)
      pose = mixPose(READY, runPose(stride), smooth(k * 1.4))
      break
    }
    case 'cruise': {
      dist = P.dAcc + P.v * local
      stride = strideAt(dist)
      pose = runPose(stride)
      break
    }
    case 'plant': {
      dist = P.dAcc + P.cruise + P.v * local - (P.v * local * local) / (2 * T.plant)
      stride = strideAt(dist)
      pose = mixPose(runPose(stride), CROUCH, easeOut(k))
      break
    }
    default: {
      dist = P.dAcc + P.cruise + dPlant
      if (phase === 'crouch') pose = CROUCH
      else if (phase === 'takeoff') { pose = mixPose(CROUCH, TAKEOFF, easeIn(k)); dist += 0.4 * L.U * k }
      else if (phase === 'air') {
        dist += 0.4 * L.U + airDist * k
        if (k < 0.18) pose = mixPose(TAKEOFF, TUCK, smooth(k / 0.18))
        else if (k < 0.7) pose = TUCK
        else pose = mixPose(TUCK, OPEN, smooth((k - 0.7) / 0.22))
        rot = 2 * Math.PI * smooth((k - 0.1) / 0.72)
        arc = 4 * 5.2 * k * (1 - k)
      } else {
        dist += 0.4 * L.U + airDist
        if (phase === 'land') pose = mixPose(OPEN, HERO, easeOut(k))
        else if (phase === 'hero') pose = { ...HERO, head: HERO.head + 0.12 * smooth(k), lean: HERO.lean + breath }
        else if (phase === 'rise') pose = mixPose(HERO, COOL, smooth(k))
        else pose = { ...COOL, lean: COOL.lean + breath }
      }
    }
  }
  return {
    phase, k, pose, dir, rot, arc, stride,
    x: P.x0 + dir * dist,
    visible: phase !== 'explode' && phase !== 'gap',
  }
}

// ---- component ----
export default function AsciiRunner() {
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
    const debugT = params.has('runner_t') ? Number(params.get('runner_t')) : null

    let L: Layout = { W: 0, H: 0, U: 1, ground: 0, fs: 6.5, cw: 4, chH: 7 }
    let cols = 0
    let rows = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const W = window.innerWidth
      const H = window.innerHeight
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(H * dpr)
      canvas!.style.width = `${W}px`
      canvas!.style.height = `${H}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const mobile = W < 640
      const fs = mobile ? 5 : 6
      ctx!.font = `${fs}px ${MONO}`
      const cw = Math.max(2.5, ctx!.measureText('M').width)
      const chH = Math.round(fs * 1.08 * 10) / 10
      const bodyH = mobile ? clamp(H * 0.24, 110, 170) : clamp(H * 0.42, 200, 400)
      L = { W, H, U: bodyH / 8, ground: H - (mobile ? 14 : 26), fs, cw, chH }
      cols = Math.ceil(W / cw)
      rows = Math.ceil(H / chH)
      off.width = cols
      off.height = rows
    }
    resize()

    // ---- stateful bits: loop clock, hair chain, particles, afterimages ----
    let loopStart = 0
    let loopIdx = 0
    let dir: 1 | -1 = 1
    const hair: { x: number; y: number; px: number; py: number }[] = []
    let hairReset = true
    let particles: Particle[] = []
    let exploded = false
    let landed = false
    let lastStride = 0
    let lastCells: Cell[] = []
    const ghosts: { cells: Cell[]; t: number }[] = []
    let lastGhostT = 0
    let bodyCenter: V = { x: 0, y: 0 }

    // screen transform for the current frame
    let toS: (p: V) => V = p => p

    function setTransform(f: Frame, rig: Rig) {
      const lift = groundLift(rig) + f.arc
      const pivot = { x: 0, y: 1.0 }
      const c = Math.cos(-f.rot)
      const s = Math.sin(-f.rot)
      const { U, ground } = L
      toS = (p: V) => {
        const dx = p.x - pivot.x
        const dy = p.y - pivot.y
        const rx = pivot.x + dx * c - dy * s
        const ry = pivot.y + dx * s + dy * c
        return { x: f.x + f.dir * rx * U, y: ground - (ry + lift) * U }
      }
    }

    // ---- low-poly painting onto the offscreen cell canvas ----
    const LIGHT = (() => { const l = Math.hypot(-0.55, -0.85); return { x: -0.55 / l, y: -0.85 / l } })()

    function rgbStr(c: RGB) {
      return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    }

    // Fan-triangulate a convex-ish polygon from its centroid and shade each
    // wedge by how much its outer edge faces the light: a faceted look.
    function facet(pts: V[], base: RGB, contrast = 0.55) {
      if (pts.length < 3) return
      let cx = 0
      let cy = 0
      for (const p of pts) { cx += p.x; cy += p.y }
      cx /= pts.length
      cy /= pts.length
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        let nx = b.y - a.y
        let ny = -(b.x - a.x)
        const mx = (a.x + b.x) / 2 - cx
        const my = (a.y + b.y) / 2 - cy
        if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny }
        const nl = Math.hypot(nx, ny) || 1
        const d = (nx * LIGHT.x + ny * LIGHT.y) / nl
        const f = 1 - contrast * 0.5 + contrast * 0.5 * d + 0.12
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

    // tapered limb between two rig points, widths in rig units
    function limb(a: V, b: V, wa: number, wb: number, c: RGB) {
      const dx = b.x - a.x
      const dy = b.y - a.y
      const l = Math.hypot(dx, dy) || 1
      const n = { x: -dy / l, y: dx / l }
      facet([add(a, n, wa), add(b, n, wb), add(b, n, -wb), add(a, n, -wa)].map(toS), c)
      // joint cap so bends don't show gaps
      facet([add(b, n, wb), add(b, { x: dx / l, y: dy / l }, wb * 0.9), add(b, n, -wb)].map(toS), c)
    }

    function drawLeg(leg: Rig['legF'], hip: V, near: boolean) {
      limb(hip, leg.knee, 0.36, 0.25, near ? MINT : MINT_SH)
      limb(leg.knee, leg.ankle, 0.25, 0.17, near ? PINK_MID : PINK_SH)
      // boot
      const sa = leg.sa
      const heel = add(leg.ankle, { x: -Math.cos(sa), y: -Math.sin(sa) }, 0.18)
      const sole = add(leg.ankle, down(sa), 0.16)
      const toeTop = add(leg.toe, down(sa), -0.08)
      facet([heel, add(leg.ankle, down(sa), -0.12), toeTop, leg.toe, add(sole, { x: Math.cos(sa), y: Math.sin(sa) }, 0.2), sole].map(toS), near ? PINK_LO : PINK_SH)
    }

    function drawArm(arm: Rig['armF'], sh: V, near: boolean) {
      limb(sh, arm.elbow, 0.2, 0.15, near ? PINK_HI : PINK_LO)
      limb(arm.elbow, arm.hand, 0.15, 0.11, near ? MINT_LO : MINT_SH)
      const d = { x: arm.hand.x - arm.elbow.x, y: arm.hand.y - arm.elbow.y }
      const l = Math.hypot(d.x, d.y) || 1
      const hd = { x: d.x / l, y: d.y / l }
      const n = { x: -hd.y, y: hd.x }
      facet([add(arm.hand, n, 0.12), add(add(arm.hand, hd, 0.32), n, 0.04), add(arm.hand, n, -0.12)].map(toS), near ? PINK_HI : PINK_LO)
    }

    function torso(r: Rig) {
      const u = upv(r.lean)
      const f = { x: u.y, y: -u.x } // forward perpendicular
      const at = (fw: number, h: number) => add(add(r.pelvis, f, fw), u, h)
      // jacket body
      facet([at(-0.5, 0), at(0.46, 0), at(0.36, 1.05), at(0.58, 1.85), at(0.42, 2.4), at(0.14, 2.6), at(-0.24, 2.6), at(-0.52, 2.38), at(-0.46, 1.55), at(-0.38, 0.95)].map(toS), PINK_MID, 0.7)
      // hips / shorts
      facet([at(-0.52, -0.2), at(0.48, -0.2), at(0.44, 0.45), at(-0.44, 0.45)].map(toS), PINK_SH, 0.5)
      // mint belt + chest stripe
      poly([at(-0.42, 0.5), at(0.42, 0.5), at(0.4, 0.68), at(-0.41, 0.68)].map(toS), MINT)
      poly([at(0.56, 1.75), at(0.58, 1.98), at(-0.47, 1.56), at(-0.45, 1.36)].map(toS), MINT_HI)
      // collar
      facet([at(-0.3, 2.35), at(0.2, 2.45), at(0.05, 2.78), at(-0.32, 2.7)].map(toS), PINK_LO, 0.4)
    }

    function head(r: Rig) {
      const u = upv(r.ha)
      const f = { x: u.y, y: -u.x }
      const at = (fw: number, h: number) => add(add(r.head, f, fw * HEADR), u, h * HEADR)
      // back of skull (darker) and face
      facet([at(0.05, 1.0), at(-0.75, 0.7), at(-0.95, 0.0), at(-0.55, -0.7), at(0.0, -0.4)].map(toS), PINK_LO, 0.6)
      facet([at(0.05, 1.0), at(0.62, 0.68), at(0.88, 0.12), at(0.72, -0.45), at(0.32, -0.98), at(0.0, -0.4)].map(toS), PINK_HI, 0.6)
      // visor
      poly([at(-0.15, 0.42), at(0.96, 0.38), at(0.94, 0.08), at(-0.1, 0.12)].map(toS), MINT_HI)
      // crown shards swept back
      facet([at(0.45, 0.85), at(-0.15, 1.55), at(-0.25, 0.95)].map(toS), PINK)
      facet([at(0.1, 0.98), at(-0.75, 1.35), at(-0.6, 0.75)].map(toS), PINK_HI)
      facet([at(0.7, 0.62), at(0.55, 1.2), at(0.2, 0.9)].map(toS), PINK)
    }

    function hairAnchor(r: Rig): { a: V; rest: V } {
      const u = upv(r.ha)
      const f = { x: u.y, y: -u.x }
      const a = add(add(r.head, f, -0.65 * HEADR), u, 0.62 * HEADR)
      const restRig = add(add(a, f, -0.85), u, -0.35)
      const sa = toS(a)
      const sr = toS(restRig)
      const len = Math.hypot(sr.x - sa.x, sr.y - sa.y) || 1
      return { a: sa, rest: { x: (sr.x - sa.x) / len, y: (sr.y - sa.y) / len } }
    }

    function stepHair(r: Rig, dt: number) {
      const { a, rest } = hairAnchor(r)
      const seg = HAIR_SEG * L.U
      if (hairReset || hair.length !== HAIR_N) {
        hair.length = 0
        for (let i = 0; i < HAIR_N; i++) {
          const x = a.x + rest.x * seg * i
          const y = a.y + rest.y * seg * i
          hair.push({ x, y, px: x, py: y })
        }
        hairReset = false
        return
      }
      hair[0].x = hair[0].px = a.x
      hair[0].y = hair[0].py = a.y
      const g = 3.2 * 8 * L.U
      for (let i = 1; i < HAIR_N; i++) {
        const h = hair[i]
        const vx = (h.x - h.px) * 0.9
        const vy = (h.y - h.py) * 0.9
        h.px = h.x
        h.py = h.y
        const k = 70 * (1 - i / HAIR_N) ** 1.5
        const tx = a.x + rest.x * seg * i
        const ty = a.y + rest.y * seg * i
        h.x += vx + (tx - h.x) * k * dt * dt
        h.y += vy + ((ty - h.y) * k + g) * dt * dt
      }
      for (let it = 0; it < 4; it++) {
        for (let i = 1; i < HAIR_N; i++) {
          const p = hair[i - 1]
          const h = hair[i]
          const dx = h.x - p.x
          const dy = h.y - p.y
          const d = Math.hypot(dx, dy) || 1
          const m = seg / d
          h.x = p.x + dx * m
          h.y = p.y + dy * m
          if (h.y > L.ground) h.y = L.ground
        }
      }
    }

    function drawHair() {
      if (hair.length < 2) return
      const U = L.U
      for (let i = 0; i < hair.length - 1; i++) {
        const p = hair[i]
        const q = hair[i + 1]
        const dx = q.x - p.x
        const dy = q.y - p.y
        const l = Math.hypot(dx, dy) || 1
        const n = { x: -dy / l, y: dx / l }
        const w0 = (0.34 - 0.04 * i) * U
        const w1 = Math.max(0.05, 0.34 - 0.04 * (i + 1)) * U
        const c = i % 2 ? PINK : PINK_HI
        facet([add(p, n, w0), add(q, n, w1), add(q, n, -w1), add(p, n, -w0)], c, 0.7)
        // jagged shard sticking out on alternating sides
        const side = i % 2 ? 1 : -1
        const tip = add(add(q, n, side * w1 * 2.6), { x: dx / l, y: dy / l }, 0.35 * U)
        facet([add(p, n, side * w0 * 0.8), tip, add(q, n, side * w1 * 0.6)], i % 2 ? PINK_MID : PINK, 0.6)
      }
    }

    // ---- rasterize the character and read it back as glyph cells ----
    function rasterize(rig: Rig): Cell[] {
      const { cw, chH } = L
      octx!.setTransform(1, 0, 0, 1, 0, 0)
      octx!.clearRect(0, 0, cols, rows)
      octx!.setTransform(1 / cw, 0, 0, 1 / chH, 0, 0)

      const hip = { x: 0, y: 0 }
      drawHair()
      drawArm(rig.armB, rig.shoulder, false)
      drawLeg(rig.legB, hip, false)
      torso(rig)
      head(rig)
      drawLeg(rig.legF, hip, true)
      drawArm(rig.armF, rig.shoulder, true)

      // bounding box in cells
      const pts = [rig.head, rig.legF.toe, rig.legB.toe, rig.armF.hand, rig.armB.hand, rig.legF.knee, rig.legB.knee, rig.pelvis, rig.neck].map(toS)
      for (const h of hair) pts.push(h)
      const pad = 1.6 * L.U
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
      const c0 = clamp(Math.floor((x0 - pad) / cw), 0, cols - 1)
      const c1 = clamp(Math.ceil((x1 + pad) / cw), 0, cols - 1)
      const r0 = clamp(Math.floor((y0 - pad) / chH), 0, rows - 1)
      const r1 = clamp(Math.ceil((y1 + pad) / chH), 0, rows - 1)
      const w = c1 - c0 + 1
      const h = r1 - r0 + 1
      if (w <= 0 || h <= 0) return []
      const data = octx!.getImageData(c0, r0, w, h).data
      bodyCenter = toS(add(rig.pelvis, upv(rig.lean), 1.2))

      const out: Cell[] = []
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const a = data[i + 3]
          if (a < 28) continue
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const cx = c0 + x, cy = r0 + y
          let v = (Math.max(r, g, b) / 255) * (a / 255)
          v = Math.pow(v, 0.8) + (hash(cx, cy) - 0.5) * 0.16
          const idx = clamp(Math.floor(v * RAMP.length), 1, RAMP.length - 1)
          const boost = clamp(215 / Math.max(r, g, b, 1), 1, 1.7)
          out.push({ cx, cy, ch: RAMP[idx], r: Math.min(255, r * boost), g: Math.min(255, g * boost), b: Math.min(255, b * boost), a: 0.5 + 0.5 * (a / 255) })
        }
      }
      return out
    }

    // ---- per-phase cell effects ----
    function applyEffects(cells: Cell[], f: Frame, now: number): Cell[] {
      if (f.phase === 'appear') {
        let minY = Infinity, maxY = -Infinity
        for (const c of cells) { minY = Math.min(minY, c.cy); maxY = Math.max(maxY, c.cy) }
        const span = Math.max(1, maxY - minY)
        const front = f.k * 1.2 - 0.1
        const out: Cell[] = []
        const tick = Math.floor(now * 24)
        for (const c of cells) {
          const rel = (maxY - c.cy) / span
          if (rel > front + 0.07) {
            if (hash(c.cx, c.cy, tick) < 0.05) out.push({ ...c, ch: '.', r: MINT[0], g: MINT[1], b: MINT[2], a: 0.35 })
          } else if (rel > front) {
            out.push({ ...c, ch: pick(GLITCH, hash(c.cx, c.cy, tick)), r: MINT_HI[0], g: MINT_HI[1], b: MINT_HI[2], a: 1 })
          } else if (hash(c.cx, c.cy, tick + 7) < (1 - f.k) * 0.25) {
            out.push({ ...c, ch: pick(GLITCH, hash(c.cy, c.cx, tick)) })
          } else out.push(c)
        }
        return out
      }
      if (f.phase === 'glitch') {
        const g = f.k
        const tick = Math.floor(now * 30)
        const out: Cell[] = []
        for (const c of cells) {
          const rowHit = hash(c.cy, tick) > 1 - 0.4 * g
          const shift = rowHit ? Math.round((hash(c.cy, tick, 3) - 0.5) * 10 * g) : 0
          let n: Cell = { ...c, cx: c.cx + shift }
          if (hash(c.cx, c.cy, tick) < 0.3 * g) n.ch = pick(GLITCH, hash(c.cy, c.cx, tick))
          if (hash(c.cx, c.cy, tick + 1) < 0.25 * g) n = { ...n, r: MINT_HI[0], g: MINT_HI[1], b: MINT_HI[2] }
          out.push(n)
          if (hash(c.cx, c.cy, tick + 2) < 0.3 * g) out.push({ ...c, cx: c.cx + 2, r: MINT[0], g: MINT[1], b: MINT[2], a: 0.4 * g })
        }
        return out
      }
      return cells
    }

    function spawnExplosion(cells: Cell[]) {
      const { cw, chH, U } = L
      const H8 = 8 * U
      for (const c of cells) {
        const x = c.cx * cw
        const y = c.cy * chH
        const dx = x - bodyCenter.x
        const dy = y - bodyCenter.y
        const d = Math.hypot(dx, dy) || 1
        const sp = (0.5 + Math.random() * 1.5) * H8 * (0.7 + d / H8)
        const ang = Math.random() * 0.8 - 0.4
        const ux = dx / d, uy = dy / d
        const max = 0.9 + Math.random() * 1.0
        particles.push({
          x, y,
          vx: (ux * Math.cos(ang) - uy * Math.sin(ang)) * sp,
          vy: (ux * Math.sin(ang) + uy * Math.cos(ang)) * sp - Math.random() * 0.6 * H8,
          ch: c.ch, c: [c.r, c.g, c.b], life: max, max, kind: 'body',
        })
      }
    }

    function spawnDust(x: number, y: number, n: number, spread: number) {
      for (let i = 0; i < n; i++) {
        const max = 0.35 + Math.random() * 0.4
        particles.push({
          x: x + (Math.random() - 0.5) * L.U,
          y: y - Math.random() * 2,
          vx: (Math.random() - 0.5) * spread - dir * spread * 0.4,
          vy: -Math.random() * spread * 0.7,
          ch: pick(DUST, Math.random()), c: MINT_LO, life: max, max, kind: 'dust',
        })
      }
    }

    function stepParticles(dt: number) {
      const g = 2.2 * 8 * L.U
      for (const p of particles) {
        const drag = p.kind === 'dust' ? 3 : 1.3
        p.vx *= 1 - drag * dt
        p.vy = p.vy * (1 - drag * dt) + g * dt * (p.kind === 'dust' ? 0.3 : 0.6)
        p.x += p.vx * dt
        p.y += p.vy * dt
        if (p.y > L.ground) { p.y = L.ground; p.vy *= -0.3; p.vx *= 0.6 }
        p.life -= dt
        if (p.kind === 'body' && Math.random() < dt * 10) p.ch = pick(GLITCH + RAMP.slice(3), Math.random())
      }
      particles = particles.filter(p => p.life > 0)
    }

    // ---- drawing ----
    const styleCache = new Map<number, string>()
    function style(r: number, g: number, b: number, a: number) {
      const key = ((r >> 3) << 15) | ((g >> 3) << 10) | ((b >> 3) << 5) | Math.round(clamp(a, 0, 1) * 31)
      let s = styleCache.get(key)
      if (!s) {
        s = `rgba(${(r >> 3) << 3},${(g >> 3) << 3},${(b >> 3) << 3},${(Math.round(clamp(a, 0, 1) * 31) / 31).toFixed(3)})`
        styleCache.set(key, s)
      }
      return s
    }

    function drawCells(cells: Cell[], tint?: RGB, alpha = 1, skipOdd = false) {
      const { cw, chH } = L
      let cur = ''
      for (const c of cells) {
        if (skipOdd && (c.cx + c.cy) % 2) continue
        const s = tint ? style(tint[0], tint[1], tint[2], c.a * alpha) : style(c.r, c.g, c.b, c.a * alpha)
        if (s !== cur) { ctx!.fillStyle = s; cur = s }
        ctx!.fillText(c.ch, c.cx * cw, c.cy * chH)
      }
    }

    function drawShadow(f: Frame, rig: Rig) {
      if (!f.visible) return
      const { cw, chH, U } = L
      const air = clamp(f.arc / 5, 0, 1)
      const cx = toS(rig.pelvis).x
      const half = (1.9 - air * 0.9) * U
      const row = Math.floor(L.ground / chH) + 1
      const tick = f.phase === 'appear' ? f.k : 1
      for (let x = cx - half; x <= cx + half; x += cw) {
        const t = 1 - Math.abs(x - cx) / half
        const ch = t > 0.66 ? '=' : t > 0.33 ? '-' : '.'
        ctx!.fillStyle = style(MINT_LO[0], MINT_LO[1], MINT_LO[2], (0.25 + 0.45 * t) * (1 - air * 0.7) * tick)
        ctx!.fillText(ch, Math.round(x / cw) * cw, row * chH)
      }
    }

    function drawParticles(now: number, explodeT: number) {
      const { cw, chH } = L
      const flash = explodeT >= 0 && explodeT < 0.08
      for (const p of particles) {
        const t = 1 - p.life / p.max
        let c = p.c
        let a = Math.pow(p.life / p.max, 0.7)
        if (p.kind === 'body') c = mixc(p.c, MINT, clamp(t * 1.8, 0, 1))
        else a *= 0.6
        const ch = flash && p.kind === 'body' ? '@' : p.ch
        if (flash && p.kind === 'body') { c = [255, 220, 235]; a = 1 }
        ctx!.fillStyle = style(c[0], c[1], c[2], a)
        ctx!.fillText(ch, Math.round(p.x / cw) * cw, Math.round(p.y / chH) * chH)
      }
      // shockwave ring
      if (explodeT >= 0 && explodeT < 0.55) {
        const k = explodeT / 0.55
        const R = (0.15 + 1.6 * easeOut(k)) * 8 * L.U
        const steps = Math.ceil((2 * Math.PI * R) / (cw * 1.6))
        ctx!.fillStyle = style(MINT_HI[0], MINT_HI[1], MINT_HI[2], (1 - k) * 0.8)
        for (let i = 0; i < steps; i++) {
          const ang = (i / steps) * Math.PI * 2
          const x = bodyCenter.x + Math.cos(ang) * R
          const y = bodyCenter.y + Math.sin(ang) * R * 0.55
          if (y > L.ground) continue
          ctx!.fillText(hash(i, Math.floor(now * 20)) > 0.5 ? '*' : '+', Math.round(x / cw) * cw, Math.round(y / chH) * chH)
        }
      }
    }

    // ---- main step ----
    let explodeAt = -1
    function step(now: number, dt: number, draw: boolean) {
      let t = now - loopStart
      let P = plan(L, dir)
      if (t >= P.total) {
        loopStart += P.total
        loopIdx++
        dir = loopIdx % 2 === 0 ? 1 : -1
        hairReset = true
        exploded = false
        landed = false
        lastCells = []
        ghosts.length = 0
        t = now - loopStart
        P = plan(L, dir)
      }
      const f = frameAt(L, dir, t)
      const rig = fk(f.pose)
      setTransform(f, rig)
      if (f.visible) stepHair(rig, dt)

      // footstep dust while running
      if (f.phase === 'acc' || f.phase === 'cruise' || f.phase === 'plant') {
        const crossed = (s: number) => Math.floor(lastStride - s) !== Math.floor(f.stride - s)
        if (crossed(0.3)) { const a = toS(rig.legF.ankle); spawnDust(a.x, L.ground, 3, 1.4 * 8 * L.U * 0.3) }
        if (crossed(0.8)) { const a = toS(rig.legB.ankle); spawnDust(a.x, L.ground, 3, 1.4 * 8 * L.U * 0.3) }
      }
      if (f.phase === 'plant' && f.k < 0.2) { const a = toS(rig.legF.toe); spawnDust(a.x, L.ground, 1, 8 * L.U * 0.5) }
      if (f.phase === 'land' && !landed) {
        landed = true
        const a = toS(rig.pelvis)
        spawnDust(a.x, L.ground, 26, 8 * L.U * 0.9)
      }
      lastStride = f.stride

      let cells: Cell[] = []
      if (f.visible) {
        cells = applyEffects(rasterize(rig), f, now)
        lastCells = cells
      }
      if (f.phase === 'explode' && !exploded) {
        exploded = true
        explodeAt = now
        spawnExplosion(lastCells)
      }
      stepParticles(dt)

      // afterimages while moving fast
      const moving = f.phase === 'cruise' || f.phase === 'air'
      if (moving && now - lastGhostT > 0.07) {
        ghosts.push({ cells, t: now })
        lastGhostT = now
      }
      while (ghosts.length && now - ghosts[0].t > GHOST_LIFE) ghosts.shift()

      if (!draw) return
      ctx!.clearRect(0, 0, L.W, L.H)
      ctx!.font = `${L.fs}px ${MONO}`
      ctx!.textBaseline = 'top'
      drawShadow(f, rig)
      for (const g of ghosts) {
        const age = (now - g.t) / GHOST_LIFE
        if (g.cells !== cells) drawCells(g.cells, MINT, 0.16 * (1 - age), true)
      }
      drawParticles(now, explodeAt >= 0 ? now - explodeAt : -1)
      if (f.visible) drawCells(cells)
    }

    // ---- run ----
    let raf = 0
    let last = 0
    let clock = 0
    const onResize = () => { resize(); hairReset = true }
    window.addEventListener('resize', onResize)

    if (debugT !== null || reduced) {
      // Deterministic still frame: simulate up to the target time, draw once.
      const target = debugT ?? 2.2
      const start = Math.max(0, target - 1.5)
      loopStart = 0
      for (let tt = 0; tt < start; tt += 1 / 30) step(tt, 1 / 30, false)
      for (let tt = start; tt < target; tt += 1 / 60) step(tt, 1 / 60, false)
      step(target, 1 / 60, true)
      return () => window.removeEventListener('resize', onResize)
    }

    const loop = (ms: number) => {
      const now = ms / 1000
      const dt = last ? Math.min(now - last, 1 / 30) : 1 / 60
      last = now
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

  // Portaled to <body> so page transitions (transforms) on ancestors can't
  // break position: fixed, and so it sits under the content's stacking context.
  return createPortal(<canvas ref={ref} className="runner-canvas" aria-hidden="true" />, document.body)
}
