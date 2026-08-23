import { useEffect, useRef, useState } from 'react'

const SHIP_ART = [
  '       !',
  '       !',
  '       ^',
  '      / \\',
  '     /___\\',
  '    |=   =|',
  '    |     |',
  '    |     |',
  '    |     |',
  '    |     |',
  '    |     |',
  '    |     |',
  '    |     |',
  '    |     |',
  '    |     |',
  '   /|##!##|\\',
  '  / |##!##| \\',
  ' /  |##!##|  \\',
  '|  / ^ | ^ \\  |',
  '| /  ( | )  \\ |',
  '|/   ( | )   \\|',
  '    ((   ))',
  '   ((  :  ))',
  '   ((  :  ))',
  '    ((   ))',
  '     (( ))',
  '      ( )',
  '       .',
  '       .',
  '       .',
].join('\n')

const HOLD_THRESHOLD_MS = 450
const FLIGHT_DURATION_MS = 2600
const FADE_DURATION_MS = 500
const TRAIL_LINGER_MS = 1400
const SHIP_HALF_LENGTH = 105

// Module-level, not React state or sessionStorage: needs to survive
// client-side route navigation (Home unmounting/remounting via the router)
// but reset on an actual page reload. A plain closure variable does exactly
// that — React state resets on remount, sessionStorage survives a reload.
let hasLaunched = false

type Flight = { x: number; y: number; vx: number; vy: number }

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  kind: 'fire' | 'smoke'
  char: string
}

const FIRE_CHARS = ['^', '*', '+', '"', 'ᐧ']
const SMOKE_CHARS = ['o', 'O', '~', '.']

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

function fireColor(t: number): [number, number, number] {
  if (t < 0.5) {
    const k = t / 0.5
    return [Math.round(lerp(255, 255, k)), Math.round(lerp(230, 140, k)), Math.round(lerp(110, 26, k))]
  }
  const k = (t - 0.5) / 0.5
  return [Math.round(lerp(255, 190, k)), Math.round(lerp(140, 35, k)), Math.round(lerp(26, 20, k))]
}

export default function AsciiSpaceship() {
  const [phase, setPhase] = useState<'idle' | 'charging' | 'launched' | 'gone'>(
    () => (hasLaunched ? 'gone' : 'idle'),
  )
  const wrapRef = useRef<HTMLDivElement>(null)
  const flyingRef = useRef<HTMLPreElement>(null)
  const trailCanvasRef = useRef<HTMLCanvasElement>(null)
  const heldLongEnoughRef = useRef(false)
  const holdTimerRef = useRef<number | null>(null)
  const flightRef = useRef<Flight | null>(null)
  const particlesRef = useRef<Particle[]>([])

  const startCharge = () => {
    heldLongEnoughRef.current = false
    setPhase('charging')
    holdTimerRef.current = window.setTimeout(() => {
      heldLongEnoughRef.current = true
    }, HOLD_THRESHOLD_MS)
  }

  const endCharge = () => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current)

    if (!heldLongEnoughRef.current) {
      setPhase('idle')
      return
    }

    const rect = wrapRef.current?.getBoundingClientRect()
    const originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    const angle0 = Math.random() * Math.PI * 2
    const speed = 7 + Math.random() * 3
    flightRef.current = {
      x: originX,
      y: originY,
      vx: Math.cos(angle0) * speed,
      vy: Math.sin(angle0) * speed,
    }
    particlesRef.current = []
    hasLaunched = true
    setPhase('launched')
  }

  useEffect(() => {
    if (phase !== 'launched') return
    const el = flyingRef.current
    const f = flightRef.current
    const canvas = trailCanvasRef.current
    if (!el || !f || !canvas) return

    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    ctx.textBaseline = 'middle'

    const start = performance.now()
    let lastT = start
    let fadeStarted = false
    let raf = 0

    const step = (t: number) => {
      const elapsed = t - start
      const dt = t - lastT
      lastT = t

      const flying = elapsed <= FLIGHT_DURATION_MS

      if (flying) {
        // occasional erratic turns so the flight reads as "zipping", not a clean bounce
        if (Math.random() < 0.04) {
          const jitter = (Math.random() - 0.5) * 1.4
          const speed = Math.hypot(f.vx, f.vy)
          const heading = Math.atan2(f.vy, f.vx) + jitter
          f.vx = Math.cos(heading) * speed
          f.vy = Math.sin(heading) * speed
        }

        f.x += f.vx
        f.y += f.vy
        if (f.x < 0) { f.x = 0; f.vx *= -1 }
        if (f.x > w) { f.x = w; f.vx *= -1 }
        if (f.y < 0) { f.y = 0; f.vy *= -1 }
        if (f.y > h) { f.y = h; f.vy *= -1 }

        const headingDeg = (Math.atan2(f.vy, f.vx) * 180) / Math.PI + 90
        el.style.transform = `translate(${f.x}px, ${f.y}px) translate(-50%, -50%) rotate(${headingDeg}deg)`

        // spawn fire/smoke particles from the tail, opposite the direction of travel
        const speedNow = Math.hypot(f.vx, f.vy) || 1
        const dirX = f.vx / speedNow
        const dirY = f.vy / speedNow
        const tailX = f.x - dirX * SHIP_HALF_LENGTH
        const tailY = f.y - dirY * SHIP_HALF_LENGTH
        const perpX = -dirY
        const perpY = dirX

        for (let i = 0; i < 2; i++) {
          const spread = (Math.random() - 0.5) * 1.6
          particlesRef.current.push({
            x: tailX,
            y: tailY,
            vx: -dirX * 1.4 + perpX * spread + (Math.random() - 0.5) * 0.4,
            vy: -dirY * 1.4 + perpY * spread + (Math.random() - 0.5) * 0.4,
            age: 0,
            life: 450 + Math.random() * 300,
            kind: 'fire',
            char: FIRE_CHARS[Math.floor(Math.random() * FIRE_CHARS.length)],
          })
        }
        if (Math.random() < 0.35) {
          particlesRef.current.push({
            x: tailX,
            y: tailY,
            vx: -dirX * 0.6 + perpX * (Math.random() - 0.5) * 2.2,
            vy: -dirY * 0.6 + perpY * (Math.random() - 0.5) * 2.2 - 0.3,
            age: 0,
            life: 1000 + Math.random() * 600,
            kind: 'smoke',
            char: SMOKE_CHARS[Math.floor(Math.random() * SMOKE_CHARS.length)],
          })
        }
      } else if (!fadeStarted) {
        fadeStarted = true
        el.style.transition = `opacity ${FADE_DURATION_MS}ms ease`
        el.style.opacity = '0'
      }

      // update + draw all particles regardless of flight phase, so the trail
      // finishes fading naturally instead of freezing when the ship vanishes
      ctx.clearRect(0, 0, w, h)
      const alive: Particle[] = []
      for (const p of particlesRef.current) {
        p.age += dt
        if (p.age >= p.life) continue
        p.x += p.vx
        p.y += p.vy
        if (p.kind === 'smoke') p.vy -= 0.002 * dt // gentle upward drift

        const t01 = p.age / p.life
        if (p.kind === 'fire') {
          const [r, g, b] = fireColor(t01)
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${1 - t01})`
        } else {
          const grey = Math.round(lerp(150, 70, t01))
          ctx.fillStyle = `rgba(${grey}, ${grey}, ${grey}, ${(1 - t01) * 0.5})`
        }
        ctx.fillText(p.char, p.x, p.y)
        alive.push(p)
      }
      particlesRef.current = alive

      if (elapsed > FLIGHT_DURATION_MS + FADE_DURATION_MS + TRAIL_LINGER_MS) {
        setPhase('gone')
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf)
  }, [phase])

  if (phase === 'gone') return null

  if (phase === 'launched') {
    return (
      <>
        <canvas ref={trailCanvasRef} className="ascii-ship-trail" aria-hidden="true" />
        <pre ref={flyingRef} className="ascii-ship-flying" aria-hidden="true">{SHIP_ART}</pre>
      </>
    )
  }

  return (
    <div
      ref={wrapRef}
      className={`ascii-ship-wrap${phase === 'charging' ? ' charging' : ''}`}
      onPointerDown={startCharge}
      onPointerUp={endCharge}
      onPointerLeave={() => { if (phase === 'charging') endCharge() }}
    >
      <pre className="ascii-ship">{SHIP_ART}</pre>
      <span className="ascii-ship-caption">hold, then release to launch</span>
    </div>
  )
}
