import { Fragment } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { profile } from '../data/profile'
import CommandPalette, { shortcutLabel } from './CommandPalette'
import { SOCIAL_ICONS, SOCIAL_ICON_COLORS } from './icons'

const TABS = [
  { to: '/experiences', label: 'experiences' },
  { to: '/projects', label: 'projects' },
  { to: '/blog', label: 'blog' },
]

// "danielmdlei@gmail.com" -> "danielmdlei[at]gmail[dot]com", to keep the
// visible text off scrapers while the mailto: link stays fully functional.
function obfuscateEmail(email: string) {
  return email.replace('@', '[at]').replace(/\./g, '[dot]')
}

export default function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  return (
    <main>
      <header className="plain-header">
        <div className="plain-header-top">
          <div>
            <h1><Link to="/">{profile.name}</Link></h1>

            <nav className="plain-nav">
              {TABS.map((t, i) => (
                <Fragment key={t.to}>
                  {i > 0 && <span className="sep"> / </span>}
                  <NavLink to={t.to} className={({ isActive }) => isActive ? 'active' : ''}>{t.label}</NavLink>
                </Fragment>
              ))}
              <CommandPalette />
            </nav>
            <p className="nav-hint">switch pages above, or press {shortcutLabel} to jump anywhere</p>
          </div>

          {isHome && <img src="/myself.png" alt="Daniel Lei" className="home-photo" />}
        </div>
      </header>

      <div className="page">
        <Outlet />
      </div>

      <footer className="plain-footer">
        <div className="footer-social">
          {profile.social.map(s => {
            const Icon = SOCIAL_ICONS[s.label]
            return (
              <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                {Icon ? <Icon className="social-icon" color={SOCIAL_ICON_COLORS[s.label]} /> : s.label}
              </a>
            )
          })}
        </div>
        <a href={`mailto:${profile.email}`} className="footer-email">{obfuscateEmail(profile.email)}</a>
      </footer>
    </main>
  )
}
