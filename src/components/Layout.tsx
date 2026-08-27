import { Fragment } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { profile } from '../data/profile'
import CommandPalette, { shortcutLabel } from './CommandPalette'

const TABS = [
  { to: '/work', label: 'work' },
  { to: '/projects', label: 'projects' },
  { to: '/writing', label: 'writing' },
]

export default function Layout() {
  return (
    <main>
      <header className="plain-header">
        <h1><Link to="/">{profile.name}</Link></h1>
        <p className="tagline">{profile.tagline}</p>

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
      </header>

      <div className="page">
        <Outlet />
      </div>

      <footer className="plain-footer">
        {profile.social.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <span className="sep"> · </span>}
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
          </Fragment>
        ))}
        <span className="sep"> · </span>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
      </footer>
    </main>
  )
}
