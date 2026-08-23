import { Link, NavLink, Outlet } from 'react-router-dom'
import { profile } from '../data/profile'

const TABS = [
  { to: '/work', label: 'work' },
  { to: '/projects', label: 'projects' },
  { to: '/writing', label: 'writing' },
]

export default function Layout() {
  return (
    <main>
      <header className="site-header">
        <Link to="/" className="site-name">
          <h1>{profile.name}</h1>
        </Link>
        <p className="site-tagline">{profile.tagline}</p>
        <nav className="social-row">
          {profile.social.map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="social-link">
              [{s.label}]
            </a>
          ))}
          <a href={`mailto:${profile.email}`} className="social-link">[email]</a>
        </nav>
      </header>

      <nav className="mode-nav">
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="page">
        <Outlet />
      </div>
    </main>
  )
}
