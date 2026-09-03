import { useEffect, useRef } from 'react'

// Decorative, projects-page-only background: classic falling-character
// "digital rain" on a canvas, weighted toward 0/1 with occasional code
// symbols mixed in. Kept at low opacity via CSS so it reads as texture,
// not a focal element.

const CHARS = '01010101010101{}[]<>/\\;:+=*#%&$~^'
const FONT_SIZE = 15
const FRAME_INTERVAL_MS = 55

export default function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let columns = 0
    let drops: number[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
      columns = Math.floor(canvas!.width / FONT_SIZE)
      drops = Array.from({ length: columns }, () => Math.random() * -100)
      ctx!.font = `${FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
    }
    resize()
    window.addEventListener('resize', resize)

    let raf = 0
    let last = 0

    function frame(t: number) {
      raf = requestAnimationFrame(frame)
      if (t - last < FRAME_INTERVAL_MS) return
      last = t

      ctx!.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const y = drops[i] * FONT_SIZE
        ctx!.fillStyle = Math.random() < 0.05 ? 'rgba(210, 255, 230, 0.9)' : 'rgba(64, 214, 138, 0.7)'
        ctx!.fillText(char, i * FONT_SIZE, y)

        if (y > canvas!.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="matrix-bg" aria-hidden="true" />
}
