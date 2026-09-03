import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'
import TypewriterBackground from '../components/TypewriterBackground'

export default function Blog() {
  return (
    <>
      <TypewriterBackground />
      <div className="blog-list">
        <p className="blog-intro">
          market and sector notes, still under development
        </p>
        {posts.length === 0 && <p className="blog-empty">no reports published yet.</p>}
        {posts.map(p => (
          <Link key={p.slug} to={`/blog/${p.slug}`} className="blog-item">
            <span className="blog-item-meta">
              {p.date}{p.sector ? ` · [${p.sector}]` : ''}
            </span>
            <span className="blog-item-title">{p.title}</span>
            {p.summary && <span className="blog-item-summary">{p.summary}</span>}
          </Link>
        ))}
      </div>
    </>
  )
}
