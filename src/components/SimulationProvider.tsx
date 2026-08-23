import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  prevX: number
  prevY: number
  alpha: number
}

type SimulationContextValue = {
  spawn: (originX: number, originY: number) => void
}

const SimulationContext = createContext<SimulationContextValue | null>(null)

export function useSimulation() {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider')
  return ctx
}

const MAX_PARTICLES = 140
const BURST_SIZE = 22

export default function SimulationProvider({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const spawnQueueRef = useRef<{ x: number; y: number }[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = window.innerWidth
    let h = window.innerHeight

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      raf = requestAnimationFrame(draw)

      // process queued spawns (from clicks) into new particles
      const queued = spawnQueueRef.current.splice(0)
      for (const { x, y } of queued) {
        const room = MAX_PARTICLES - particlesRef.current.length
        const count = Math.min(BURST_SIZE, Math.max(0, room))
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1.2 + Math.random() * 2.6
          particlesRef.current.push({
            x,
            y,
            prevX: x,
            prevY: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 0.4 + Math.random() * 0.35,
          })
        }
      }

      // fade the whole canvas slightly instead of clearing, so trails persist briefly
      ctx.fillStyle = 'rgba(10, 15, 14, 0.06)'
      ctx.fillRect(0, 0, w, h)

      ctx.lineWidth = 1
      for (const p of particlesRef.current) {
        p.prevX = p.x
        p.prevY = p.y

        // jagged random-walk jitter so lines read as stock-chart noise, not straight rays
        p.vy += (Math.random() - 0.5) * 0.5
        p.vx += (Math.random() - 0.5) * 0.15
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.x > w) { p.x = w; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        if (p.y > h) { p.y = h; p.vy *= -1 }

        ctx.strokeStyle = `rgba(29, 255, 176, ${p.alpha})`
        ctx.beginPath()
        ctx.moveTo(p.prevX, p.prevY)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const spawn = (originX: number, originY: number) => {
    spawnQueueRef.current.push({ x: originX, y: originY })
  }

  return (
    <SimulationContext.Provider value={{ spawn }}>
      <canvas ref={canvasRef} className="stock-bg-canvas" aria-hidden="true" />
      {children}
    </SimulationContext.Provider>
  )
}
