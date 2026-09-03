import { useEffect, useRef } from 'react'

// Decorative, blog-page-only background: a handful of loose handwriting-
// style scribbles that draw themselves in, pause, erase, and repeat, each
// on its own timing. A small dot traces the line while it's being "written".

const SCRIBBLES = [
  { d: 'M40,90 C120,20 180,160 260,80 S 420,10 480,90 C 540,150 600,40 680,100', delay: 0, duration: 9 },
  { d: 'M120,260 C200,200 260,320 340,250 S 480,180 560,260 C 630,320 700,220 780,270', delay: -3, duration: 10 },
  { d: 'M60,430 C140,370 210,480 300,410 S 460,350 540,430 C 610,480 680,390 760,440', delay: -6, duration: 8.5 },
  { d: 'M300,580 C380,520 440,630 520,560 S 660,500 740,580 C 800,630 860,540 930,590', delay: -2, duration: 9.5 },
  { d: 'M700,140 C770,90 830,190 900,130 S 1030,80 1100,140', delay: -5, duration: 7.5 },
]

export default function BlogBackground() {
  const pathRefs = useRef<(SVGPathElement | null)[]>([])

  useEffect(() => {
    pathRefs.current.forEach(path => {
      if (!path) return
      const len = path.getTotalLength()
      path.style.setProperty('--len', String(len))
      path.style.strokeDasharray = String(len)
    })
  }, [])

  return (
    <svg
      className="blog-bg"
      aria-hidden="true"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
    >
      {SCRIBBLES.map((s, i) => {
        const timing = { animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }
        return (
          <g key={i}>
            <path ref={el => { pathRefs.current[i] = el }} d={s.d} className="scribble" style={timing} />
            <circle r="4" className="pen-dot" style={timing}>
              <animateMotion path={s.d} keyPoints="0;1;1" keyTimes="0;0.35;1" dur={`${s.duration}s`} begin={`${s.delay}s`} repeatCount="indefinite" calcMode="linear" />
            </circle>
          </g>
        )
      })}
    </svg>
  )
}
