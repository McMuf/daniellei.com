import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import WebringBadge from './WebringBadge'

const SITE_URL = 'https://daniellei-com.vercel.app/'
const WEBRING_BASE = `https://cs.uwatering.com/#${SITE_URL}`

const TABS = [
  { to: '/', label: 'about', end: true },
  { to: '/experiences', label: 'experience', end: false },
  { to: '/projects', label: 'projects', end: false },
  { to: '/blog', label: 'blog', end: false },
]

// Underline that slides to whichever nav link is active.
function useIndicator(pathname: string) {
  const navRef = useRef<HTMLElement>(null)
  const [style, setStyle] = useState<{ x: number; y: number; w: number; on: boolean; anim: boolean }>({ x: 0, y: 0, w: 0, on: false, anim: false })
  const first = useRef(true)

  useLayoutEffect(() => {
    const place = (anim: boolean) => {
      const nav = navRef.current
      const el = nav?.querySelector<HTMLAnchorElement>('a.active')
      if (!nav || !el) { setStyle(s => ({ ...s, on: false })); return }
      const nb = nav.getBoundingClientRect()
      const b = el.getBoundingClientRect()
      setStyle({ x: b.left - nb.left, y: b.bottom - nb.top, w: b.width, on: true, anim })
    }
    place(!first.current)
    first.current = false
    const onResize = () => place(false)
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(() => place(false))
    return () => window.removeEventListener('resize', onResize)
  }, [pathname])

  return { navRef, style }
}

export default function Layout() {
  const { pathname } = useLocation()
  const { navRef, style } = useIndicator(pathname)

  return (
    <>
      <nav className="top" aria-label="Pages" ref={navRef}>
        {TABS.map(t => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
        <CommandPalette />
        <span
          className={`indicator${style.anim ? '' : ' no-anim'}`}
          aria-hidden="true"
          style={{ transform: `translate(${style.x}px, ${style.y}px)`, width: style.w, opacity: style.on ? 1 : 0 }}
        />
      </nav>

      <main className="site">
        <div className="view" key={pathname}>
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <a href={`${WEBRING_BASE}?nav=prev`} aria-label="Previous site in the UW CS webring" title="Previous">←</a>
        <a href={WEBRING_BASE} target="_blank" rel="noopener noreferrer" aria-label="UW CS webring" title="UW CS webring">
          <WebringBadge />
        </a>
        <a href={`${WEBRING_BASE}?nav=next`} aria-label="Next site in the UW CS webring" title="Next">→</a>
      </footer>
    </>
  )
}
