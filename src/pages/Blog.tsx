import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'
import TypewriterBackground from '../components/TypewriterBackground'

const quotes = [
  "there's grace in simplicity",
  'comfort in mediocrity is the greatest mistake one can make',
  'the meaning of life is to make life meaningful',
]

export default function Blog() {
  return (
    <>
      <TypewriterBackground />
      <div className="blog-list">
        <section className="mindset">
          <h2 className="mindset-title">mindset</h2>
          <div className="mindset-box">
            {quotes.map(q => (
              <p key={q} className="mindset-quote">"{q}"</p>
            ))}
          </div>
        </section>
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
