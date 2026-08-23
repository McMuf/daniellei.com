import { useEffect, useRef, useState } from 'react'

const SHIP_ART = [
  '   /\\',
  '  /||\\',
  ' |----|',
  ' |    |',
  '  \\  /',
  '   \\/',
].join('\n')

const HOLD_THRESHOLD_MS = 450
const FLIGHT_DURATION_MS = 2600
const FADE_DURATION_MS = 500

// Module-level, not React state or sessionStorage: needs to survive
// client-side route navigation (Home unmounting/remounting via the router)
// but reset on an actual page reload. A plain closure variable does exactly
// that — React state resets on remount, sessionStorage survives a reload.
let hasLaunched = false

type Flight = { x: number; y: number; vx: number; vy: number }

export default function AsciiSpaceship() {
  const [phase, setPhase] = useState<'idle' | 'charging' | 'launched' | 'gone'>(
    () => (hasLaunched ? 'gone' : 'idle'),
  )
  const wrapRef = useRef<HTMLDivElement>(null)
  const flyingRef = useRef<HTMLPreElement>(null)
  const heldLongEnoughRef = useRef(false)
  const holdTimerRef = useRef<number | null>(null)
  const flightRef = useRef<Flight | null>(null)

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
    hasLaunched = true
    setPhase('launched')
  }

  useEffect(() => {
    if (phase !== 'launched') return
    const el = flyingRef.current
    const f = flightRef.current
    if (!el || !f) return

    const w = window.innerWidth
    const h = window.innerHeight
    const start = performance.now()
    let raf = 0

    const step = (t: number) => {
      const elapsed = t - start

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

      if (elapsed > FLIGHT_DURATION_MS) {
        el.style.transition = `opacity ${FADE_DURATION_MS}ms ease`
        el.style.opacity = '0'
        window.setTimeout(() => setPhase('gone'), FADE_DURATION_MS)
        return
      }
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)

    return () => cancelAnimationFrame(raf)
  }, [phase])

  if (phase === 'gone') return null

  if (phase === 'launched') {
    return <pre ref={flyingRef} className="ascii-ship-flying" aria-hidden="true">{SHIP_ART}</pre>
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
