import { Link } from 'react-router-dom'
import { profile } from '../data/profile'
import { posts } from '../lib/posts'

export default function Home() {
  const latest = posts[0]

  return (
    <div className="home">
      {profile.bio.map((p, i) => (
        <p key={i} className="home-bio">{p}</p>
      ))}

      {latest && (
        <div className="latest-report">
          <p className="section-label">latest report</p>
          <Link to={`/writing/${latest.slug}`} className="latest-report-card">
            <span className="latest-report-meta">
              {latest.date}{latest.sector ? ` · [${latest.sector}]` : ''}
            </span>
            <span className="latest-report-title">{latest.title}</span>
            {latest.summary && <span className="latest-report-summary">{latest.summary}</span>}
          </Link>
        </div>
      )}
    </div>
  )
}
