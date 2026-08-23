import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'

export default function Writing() {
  return (
    <div className="writing-list">
      <p className="writing-intro">
        market and sector notes, written roughly every two months — the same cadence as a fund's client letter.
      </p>
      {posts.length === 0 && <p className="writing-empty">no reports published yet.</p>}
      {posts.map(p => (
        <Link key={p.slug} to={`/writing/${p.slug}`} className="writing-item">
          <span className="writing-item-meta">
            {p.date}{p.sector ? ` · [${p.sector}]` : ''}
          </span>
          <span className="writing-item-title">{p.title}</span>
          {p.summary && <span className="writing-item-summary">{p.summary}</span>}
        </Link>
      ))}
    </div>
  )
}
