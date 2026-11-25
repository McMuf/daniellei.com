import { useEffect, useRef } from 'react'

// Muted looping clip that only downloads once it's near the viewport and
// pauses when scrolled away, so a page of these stays light.
export default function LoopVideo({ src, label }: { src: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = src
          if (!reduced) v.play().catch(() => {})
        } else {
          v.pause()
        }
      },
      { rootMargin: '200px 0px' },
    )
    obs.observe(v)
    return () => obs.disconnect()
  }, [src])

  return <video ref={ref} className="clip" muted loop playsInline preload="none" aria-label={label} />
}
