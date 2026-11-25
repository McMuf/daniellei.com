import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Home-page ASCII figure: an original front-facing, angular character drawn
// once as high-resolution glyph art in the bottom-right corner. She doesn't
// move; pink lightning arcs out of her crest and outstretched hand and
// streaks across the screen, with small crackles around her body.
//
// Rendering: the figure is painted as flat low-poly shapes onto a tiny
// offscreen canvas (one pixel per text cell), read back, and drawn as
// monospace glyphs chosen by brightness. That glyph layer is cached; each
// frame only composites it and draws the lightning.

type V = { x: number; y: number }
type RGB = [number, number, number]
type Bolt = { id: number; paths: V[][]; born: number; life: number; strong: boolean }

const RAMP = ' .:-=+*#%@'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const PINK_HI = hex('#ff7aa8')
const PINK = hex('#ff3d7f')
const PINK_MID = hex('#e8306f')
const PINK_LO = hex('#a51d52')
const PINK_SH = hex('#6e1640')
const MINT_HI = hex('#8dffdc')
const MINT = hex('#35e6ae')
const MINT_LO = hex('#1d8f6b')
const INK = hex('#3a0d22')
const WHITE: RGB = [255, 255, 255]
const WHITE_PINK: RGB = [255, 226, 238]

// skeleton (units; the figure is about 7.6 tall)
const THIGH = 1.7
const SHIN = 1.6
const TORSO = 2.55
const NECK = 0.3
const HEADR = 0.66
const UARM = 1.35
const FARM = 1.25
const FIG_H = 7.7

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const add = (a: V, d: V, s: number): V => ({ x: a.x + d.x * s, y: a.y + d.y * s })
const dirv = (a: number): V => ({ x: Math.sin(a), y: -Math.cos(a) })
const upv = (a: number): V => ({ x: Math.sin(a), y: Math.cos(a) })
function hash(x: number, y: number, z = 0) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// Standing pose, front view. Angles: legs/arms measured from straight down,
// + = outward. Her left arm (screen left) reaches out to the side.
const POSE = { tilt: -0.05, head: 0.12, thL: 0.1, shL: 0.0, thR: 0.2, shR: 0.06, arL: 1.3, elL: -0.12, arR: 0.25, elR: 0.3 }

function rig() {
  const p = POSE
  const P: V = { x: 0, y: 0 }
  const u = upv(p.tilt)
  const r = { x: u.y, y: -u.x }
  const neck = add(P, u, TORSO)
  const shC = add(P, u, TORSO - 0.32)
  const leg = (side: number, th: number, sh: number) => {
    const hip = add(P, r, side * 0.42)
    const knee = add(hip, dirv(side * th), THIGH)
    const ankle = add(knee, dirv(side * sh), SHIN)
    const toe = add(ankle, { x: side * 0.32, y: -0.32 }, 1)
    return { hip, knee, ankle, toe, side }
  }
  const arm = (side: number, ar: number, el: number) => {
    const sh = add(shC, r, side * 0.62)
    const a = side * ar + p.tilt
    const elbow = add(sh, dirv(a), UARM)
    const fa = a + side * el
    const hand = add(elbow, dirv(fa), FARM)
    return { sh, elbow, hand, fa, side }
  }
  const ha = p.tilt + p.head
  const legL = leg(-1, p.thL, p.shL)
  const legR = leg(1, p.thR, p.shR)
  return {
    P, u, r, neck, ha,
    head: add(neck, upv(ha), NECK + HEADR),
    legL, legR,
    armL: arm(-1, p.arL, p.elL),
    armR: arm(1, p.arR, p.elR),
    foot: Math.min(legL.ankle.y, legL.toe.y, legR.ankle.y, legR.toe.y),
  }
}
type Rig = ReturnType<typeof rig>

export default function SparkFigure() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const off = document.createElement('canvas') // one pixel per cell
    const octx = off.getContext('2d', { willReadFrequently: true })
    const layer = document.createElement('canvas') // cached glyph art
    const lctx = layer.getContext('2d')
    if (!ctx || !octx || !lctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const params = new URLSearchParams(window.location.search)
    const debugT = params.has('fig_t') ? Number(params.get('fig_t')) : null

    let W = 0, H = 0, dpr = 1
    let fs = 3.4, cw = 2, chH = 3.7, cols = 0, rows = 0
    let bfs = 9, bcw = 5.4, bch = 9.7
    let U = 60
    let A: V = { x: 0, y: 0 } // feet anchor (screen)
    const R = rig()

    // rig space (y up, feet at 0) -> screen
    const toS = (p: V): V => ({ x: A.x + p.x * U, y: A.y - (p.y - R.foot) * U })

    // ---------- painting ----------
    const LIGHT = { x: -0.54, y: -0.84 }
    const rgbStr = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    function facet(pts: V[], base: RGB, contrast = 0.32) {
      const sp = pts.map(toS)
      let cx = 0, cy = 0
      for (const p of sp) { cx += p.x; cy += p.y }
      cx /= sp.length
      cy /= sp.length
      for (let i = 0; i < sp.length; i++) {
        const a = sp[i], b = sp[(i + 1) % sp.length]
        let nx = b.y - a.y, ny = -(b.x - a.x)
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
      pts.map(toS).forEach((p, i) => (i ? octx!.lineTo(p.x, p.y) : octx!.moveTo(p.x, p.y)))
      octx!.closePath()
      octx!.fill()
    }
    function limb(a: V, b: V, wa: number, wb: number, c: RGB) {
      const dx = b.x - a.x, dy = b.y - a.y
      const l = Math.hypot(dx, dy) || 1
      const n = { x: -dy / l, y: dx / l }
      facet([add(a, n, wa), add(b, n, wb), add(b, n, -wb), add(a, n, -wa)], c)
      facet([add(b, n, wb), add(b, { x: dx / l, y: dy / l }, wb * 0.9), add(b, n, -wb)], c)
    }

    function drawLeg(l: Rig['legL']) {
      const s = l.side
      limb(l.hip, l.knee, 0.36, 0.25, PINK_LO)
      limb(l.knee, l.ankle, 0.25, 0.15, PINK_MID)
      // angular shin plate
      facet([add(l.knee, { x: s * 0.05, y: -0.35 }, 1), add(l.knee, { x: s * 0.32, y: -0.9 }, 1), add(l.ankle, { x: s * 0.02, y: 0.45 }, 1)], PINK_HI)
      facet([add(l.knee, { x: 0, y: 1 }, 0.26), add(l.knee, { x: 1, y: 0 }, 0.22), add(l.knee, { x: 0, y: -1 }, 0.3), add(l.knee, { x: -1, y: 0 }, 0.22)], MINT)
      facet([add(l.ankle, { x: -s, y: 0 }, 0.17), add(l.ankle, { x: s, y: 0.1 }, 0.2), l.toe, add(l.ankle, { x: -s * 0.1, y: -0.32 }, 1)], PINK_SH)
    }

    function drawArm(a: Rig['armL']) {
      const s = a.side
      facet([add(a.sh, { x: s * 0.3, y: 0.24 }, 1), add(a.sh, { x: -s * 0.05, y: 0.3 }, 1), add(a.sh, { x: -s * 0.12, y: -0.1 }, 1), add(a.sh, { x: s * 0.45, y: -0.3 }, 1)], PINK_HI)
      limb(a.sh, a.elbow, 0.19, 0.14, PINK_HI)
      limb(a.elbow, a.hand, 0.14, 0.1, PINK_SH)
      // mint cuff
      const d = dirv(a.fa)
      const n = { x: -d.y, y: d.x }
      const cuff = add(a.elbow, d, FARM * 0.72)
      poly([add(cuff, n, 0.15), add(add(cuff, d, 0.16), n, 0.13), add(add(cuff, d, 0.16), n, -0.13), add(cuff, n, -0.15)], MINT)
      // hand: palm + three fingers
      facet([add(a.hand, n, 0.14), add(add(a.hand, d, 0.2), n, 0.12), add(add(a.hand, d, 0.2), n, -0.12), add(a.hand, n, -0.14)], PINK_LO)
      for (const f of [-0.09, 0, 0.09]) {
        const base = add(add(a.hand, d, 0.2), n, f)
        const fd = { x: d.x + n.x * f * 2.2, y: d.y + n.y * f * 2.2 }
        poly([add(base, n, 0.035), add(base, fd, 0.3), add(base, n, -0.035)], PINK_LO)
      }
    }

    function drawTorso() {
      const at = (fw: number, h: number) => add(add(R.P, R.r, fw), R.u, h)
      facet([at(-0.55, -0.28), at(0.55, -0.28), at(0.5, 0.45), at(-0.5, 0.45)], PINK_LO)
      facet([at(-0.5, 0.3), at(0.5, 0.3), at(0.36, 1.0), at(0.62, 1.9), at(0.66, 2.3), at(0.2, 2.62), at(-0.2, 2.62), at(-0.66, 2.3), at(-0.62, 1.9), at(-0.36, 1.0)], PINK_MID)
      // chest plates
      facet([at(-0.55, 1.95), at(-0.05, 2.25), at(-0.08, 1.55), at(-0.45, 1.45)], PINK_HI)
      facet([at(0.55, 1.95), at(0.05, 2.25), at(0.08, 1.55), at(0.45, 1.45)], PINK)
      poly([at(-0.66, 2.18), at(-0.42, 2.34), at(0.52, 0.66), at(0.3, 0.52)], MINT) // sash
      poly([at(-0.5, 0.42), at(0.5, 0.42), at(0.47, 0.6), at(-0.47, 0.6)], MINT_LO) // belt
      poly([at(-0.08, 0.38), at(0.08, 0.38), at(0.08, 0.64), at(-0.08, 0.64)], MINT_HI) // buckle
      facet([at(-0.42, 2.4), at(0.42, 2.4), at(0.32, 2.95), at(-0.32, 2.95)], PINK_LO) // high collar
    }

    function drawHead() {
      const hu = upv(R.ha)
      const hr = { x: hu.y, y: -hu.x }
      const at = (x: number, y: number) => add(add(R.head, hr, x * HEADR), hu, y * HEADR)
      // shard crest
      facet([at(-0.34, 0.82), at(-0.85, 2.1), at(-0.04, 1.0)], PINK)
      facet([at(-0.12, 1.0), at(0.14, 2.7), at(0.36, 0.95)], PINK_HI)
      facet([at(0.3, 0.82), at(1.02, 1.9), at(0.6, 0.62)], PINK)
      facet([at(-0.55, 0.72), at(-1.3, 1.45), at(-0.72, 0.42)], PINK_MID)
      // ear fins
      facet([at(-0.8, 0.25), at(-1.3, 0.62), at(-0.84, -0.2)], MINT)
      facet([at(0.8, 0.25), at(1.3, 0.62), at(0.84, -0.2)], MINT)
      // face: lit upper planes, shaded jaw
      facet([at(0, 1.05), at(-0.72, 0.62), at(-0.84, -0.05), at(0, -0.1), at(0.84, -0.05), at(0.72, 0.62)], PINK_HI, 0.25)
      facet([at(-0.84, -0.05), at(-0.45, -0.72), at(0, -1.04), at(0.45, -0.72), at(0.84, -0.05), at(0, -0.1)], PINK_MID, 0.3)
      // side-swept fringe over one side of the forehead
      facet([at(-0.75, 0.75), at(0.35, 1.02), at(-0.1, 0.62), at(-0.55, 0.5)], PINK)
      facet([at(-0.72, 0.62), at(-0.98, -0.25), at(-0.6, 0.35)], PINK_MID)
      // visor
      poly([at(-0.9, 0.44), at(0.9, 0.44), at(0.82, 0.04), at(-0.82, 0.04)], MINT)
      poly([at(-0.9, 0.44), at(0.9, 0.44), at(0.88, 0.38), at(-0.88, 0.38)], MINT_HI)
      // eyes: angular, narrowed, with bright glints
      poly([at(-0.66, 0.32), at(-0.16, 0.3), at(-0.22, 0.12), at(-0.6, 0.15)], INK)
      poly([at(0.66, 0.32), at(0.16, 0.3), at(0.22, 0.12), at(0.6, 0.15)], INK)
      poly([at(-0.44, 0.29), at(-0.3, 0.28), at(-0.32, 0.18), at(-0.45, 0.19)], WHITE)
      poly([at(0.44, 0.29), at(0.3, 0.28), at(0.32, 0.18), at(0.45, 0.19)], WHITE)
      // brows
      poly([at(-0.7, 0.42), at(-0.14, 0.36), at(-0.16, 0.33), at(-0.7, 0.38)], INK)
      poly([at(0.7, 0.42), at(0.14, 0.36), at(0.16, 0.33), at(0.7, 0.38)], INK)
      // nose, cheek marks, mouth
      poly([at(0.0, -0.02), at(0.07, -0.3), at(-0.04, -0.3)], PINK_LO)
      poly([at(-0.62, -0.12), at(-0.4, -0.14), at(-0.55, -0.32)], MINT)
      poly([at(0.62, -0.12), at(0.4, -0.14), at(0.55, -0.32)], MINT)
      poly([at(-0.24, -0.55), at(0.24, -0.53), at(0.16, -0.62), at(-0.16, -0.63)], INK)
      poly([at(-0.14, -0.66), at(0.14, -0.65), at(0.08, -0.7), at(-0.08, -0.71)], PINK_LO)
    }

    // ---------- build the cached glyph layer ----------
    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      for (const c of [canvas!, layer]) {
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
      }
      canvas!.style.width = `${W}px`
      canvas!.style.height = `${H}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      lctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const mobile = W < 640
      fs = mobile ? 3 : 3.4
      lctx!.font = `${fs}px ${MONO}`
      cw = lctx!.measureText('M').width
      chH = Math.round(fs * 1.1 * 100) / 100
      bfs = mobile ? 7 : 9
      ctx!.font = `bold ${bfs}px ${MONO}`
      bcw = ctx!.measureText('M').width
      bch = Math.round(bfs * 1.08 * 10) / 10
      cols = Math.ceil(W / cw)
      rows = Math.ceil(H / chH)
      off.width = cols
      off.height = rows

      const figH = mobile ? clamp(H * 0.34, 180, 260) : clamp(H * 0.66, 320, 640)
      U = figH / FIG_H
      A = { x: W - 2.3 * U - (mobile ? 6 : 28), y: H - 6 }

      octx!.setTransform(1, 0, 0, 1, 0, 0)
      octx!.clearRect(0, 0, cols, rows)
      octx!.setTransform(1 / cw, 0, 0, 1 / chH, 0, 0)
      drawLeg(R.legL)
      drawLeg(R.legR)
      drawTorso()
      drawArm(R.armR)
      drawHead()
      drawArm(R.armL)

      // read back the figure's bounding region
      const x0 = clamp(Math.floor((A.x - 5 * U) / cw), 0, cols - 1)
      const x1 = clamp(Math.ceil((A.x + 3 * U) / cw), 0, cols - 1)
      const y0 = clamp(Math.floor((A.y - (FIG_H + 1.2) * U) / chH), 0, rows - 1)
      const y1 = rows - 1
      const w = x1 - x0 + 1, h = y1 - y0 + 1
      lctx!.clearRect(0, 0, W, H)
      if (w < 2 || h < 2) return
      const data = octx!.getImageData(x0, y0, w, h).data
      lctx!.font = `${fs}px ${MONO}`
      lctx!.textBaseline = 'top'
      let cur = ''
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          const a = data[i + 3]
          if (a < 24) continue
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const cx = x0 + x, cy = y0 + y
          const lum = Math.max(r, g, b) / 255
          let v = Math.pow(lum * (a / 255), 0.6) + (hash(cx, cy) - 0.5) * 0.1
          const dark = lum < 0.3 // ink lines (eyes, brows, mouth) stay dense and dark
          if (dark) v = 0.95
          const idx = clamp(Math.floor(v * RAMP.length), 1, RAMP.length - 1)
          const boost = dark ? 1 : clamp(245 / Math.max(r, g, b, 1), 1, 2)
          const s = `rgba(${Math.min(255, r * boost) | 0},${Math.min(255, g * boost) | 0},${Math.min(255, b * boost) | 0},${(0.75 + 0.25 * (a / 255)).toFixed(2)})`
          if (s !== cur) { lctx!.fillStyle = s; cur = s }
          lctx!.fillText(RAMP[idx], cx * cw, cy * chH)
        }
      }
    }

    // ---------- lightning ----------
    let bolts: Bolt[] = []
    let boltId = 0
    let rngState = debugT !== null ? 99 : (Date.now() & 0xffff) + 1
    const rnd = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0
      return rngState / 4294967296
    }
    function jag(a: V, b: V, rough: number, depth: number): V[] {
      let pts = [a, b]
      let amp = Math.hypot(b.x - a.x, b.y - a.y) * rough
      for (let d = 0; d < depth; d++) {
        const nxt: V[] = [pts[0]]
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1]
          const dx = q.x - p.x, dy = q.y - p.y
          const l = Math.hypot(dx, dy) || 1
          const o = (rnd() - 0.5) * 2 * amp
          nxt.push({ x: (p.x + q.x) / 2 + (-dy / l) * o, y: (p.y + q.y) / 2 + (dx / l) * o }, q)
        }
        pts = nxt
        amp *= 0.55
      }
      return pts
    }
    function spawnBolt(a: V, b: V, now: number, strong: boolean, life: number) {
      const main = jag(a, b, strong ? 0.14 : 0.22, strong ? 7 : 4)
      const paths = [main]
      const nb = strong ? 2 + Math.floor(rnd() * 3) : Math.floor(rnd() * 2)
      for (let i = 0; i < nb; i++) {
        const s = main[Math.floor(main.length * (0.15 + rnd() * 0.7))]
        const len = Math.hypot(b.x - a.x, b.y - a.y) * (0.1 + rnd() * 0.22)
        const ang = Math.atan2(b.y - a.y, b.x - a.x) + (rnd() - 0.5) * 1.8
        paths.push(jag(s, { x: s.x + Math.cos(ang) * len, y: s.y + Math.sin(ang) * len }, 0.22, 4))
      }
      bolts.push({ id: boltId++, paths, born: now, life, strong })
    }
    // emission points: crest tips and the outstretched hand
    function emitters(): V[] {
      const hu = upv(R.ha)
      const hr = { x: hu.y, y: -hu.x }
      const at = (x: number, y: number) => toS(add(add(R.head, hr, x * HEADR), hu, y * HEADR))
      const d = dirv(R.armL.fa)
      return [at(0.14, 2.7), at(-0.85, 2.1), at(1.02, 1.9), at(-1.3, 1.45), toS(add(R.armL.hand, d, 0.5)), toS(add(R.armL.hand, d, 0.5))]
    }
    let nextStrike = 0.4
    let nextCrackle = 0.2
    function stepLightning(now: number) {
      if (now > nextStrike) {
        const src = emitters()[Math.floor(rnd() * 6)]
        // streak out across the page, away from her corner
        const ang = Math.PI * (0.85 + rnd() * 0.6) // left .. up-left .. up
        const len = Math.max(W, H) * (0.45 + rnd() * 0.7)
        spawnBolt(src, { x: src.x + Math.cos(ang) * len, y: src.y + Math.sin(ang) * len }, now, true, 0.42)
        nextStrike = now + 1.1 + rnd() * 2.2
      }
      if (now > nextCrackle) {
        const e = emitters()
        const a = e[Math.floor(rnd() * e.length)]
        const ang = rnd() * Math.PI * 2
        const len = U * (0.6 + rnd() * 1.6)
        spawnBolt(a, { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len }, now, false, 0.16)
        nextCrackle = now + 0.25 + rnd() * 0.7
      }
    }

    const styleCache = new Map<number, string>()
    function style(c: RGB, a: number) {
      const ai = Math.round(clamp(a, 0, 1) * 31)
      const key = ((c[0] >> 3) << 15) | ((c[1] >> 3) << 10) | ((c[2] >> 3) << 5) | ai
      let s = styleCache.get(key)
      if (!s) {
        s = `rgba(${(c[0] >> 3) << 3},${(c[1] >> 3) << 3},${(c[2] >> 3) << 3},${(ai / 31).toFixed(3)})`
        styleCache.set(key, s)
      }
      return s
    }
    function drawBolts(now: number) {
      bolts = bolts.filter(b => now - b.born < b.life)
      ctx!.font = `bold ${bfs}px ${MONO}`
      ctx!.textBaseline = 'top'
      for (const b of bolts) {
        const age = (now - b.born) / b.life
        const flick = hash(b.id, Math.floor(now * 45)) > 0.25 ? 1 : 0.4
        const alpha = Math.pow(1 - age, 1.1) * flick
        const reveal = clamp(age / 0.3, 0, 1) // shoots outward from her, then fades
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
              const cx = Math.round((p.x + (dx * s) / steps) / bcw)
              const cy = Math.round((p.y + (dy * s) / steps) / bch)
              const key = cx * 100003 + cy
              if (seen.has(key)) continue
              seen.add(key)
              ctx!.fillStyle = style(PINK, core * 0.3)
              ctx!.fillText('·', cx * bcw, (cy - 1) * bch)
              ctx!.fillText('·', cx * bcw, (cy + 1) * bch)
              ctx!.fillStyle = style(hash(cx, cy, b.id) > (b.strong ? 0.7 : 0.8) ? WHITE_PINK : PINK_HI, core)
              ctx!.fillText(ch, cx * bcw, cy * bch)
            }
          }
        })
      }
    }

    function frame(now: number) {
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx!.drawImage(layer, 0, 0)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawBolts(now)
    }

    build()
    const onResize = () => { build(); bolts = [] }
    window.addEventListener('resize', onResize)

    if (reduced || debugT !== null) {
      if (debugT !== null) {
        for (let t = 0; t <= debugT; t += 1 / 60) stepLightning(t)
        frame(debugT)
      } else frame(0)
      return () => window.removeEventListener('resize', onResize)
    }

    let raf = 0
    let start = -1
    const loop = (ms: number) => {
      if (start < 0) start = ms
      const now = (ms - start) / 1000
      stepLightning(now)
      frame(now)
      raf = requestAnimationFrame(loop)
    }
    const onVis = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0 }
      else if (!raf) raf = requestAnimationFrame(loop)
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
