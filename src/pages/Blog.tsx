import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'

const quotes = [
  "there's grace in simplicity",
  'comfort in mediocrity is the greatest mistake one can make',
  'the meaning of life is to make life meaningful',
]

export default function Blog() {
  return (
    <>
      <h1 className="page-title">blog</h1>
      <p className="page-sub">monthly notes on markets, tech, and whatever else happened</p>

      <section className="mindset">
        <h2>mindset</h2>
        {quotes.map(q => (
          <p key={q} className="quote">“{q}”</p>
        ))}
      </section>

      {posts.length === 0 && <p className="page-sub">no posts yet.</p>}
      <div className="rows">
        {posts.map(p => (
          <article key={p.slug} className="row">
            <header>
              <h3><Link to={`/blog/${p.slug}`}>{p.title}</Link></h3>
              <span className="when">{p.date}</span>
            </header>
            {p.summary && <p className="summary muted">{p.summary}</p>}
            {p.sector && <p className="meta"><span>{p.sector}</span></p>}
          </article>
        ))}
      </div>
    </>
  )
}
