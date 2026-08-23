import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import GithubSlugger from 'github-slugger'
import { getPost } from '../lib/posts'

function extractHeadings(markdown: string) {
  const slugger = new GithubSlugger()
  const headings: { id: string; text: string }[] = []
  for (const line of markdown.split('\n')) {
    const m = line.match(/^##\s+(.*)$/)
    if (m) {
      const text = m[1].trim()
      headings.push({ id: slugger.slug(text), text })
    }
  }
  return headings
}

export default function Post() {
  const { slug } = useParams<{ slug: string }>()
  const post = slug ? getPost(slug) : undefined
  const headings = useMemo(() => (post ? extractHeadings(post.content) : []), [post])
  const [active, setActive] = useState(headings[0]?.id)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!post || headings.length === 0) return
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }),
      { rootMargin: '-10% 0px -70% 0px' },
    )
    headings.forEach(h => {
      const el = document.getElementById(h.id)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [post, headings])

  if (!post) {
    return (
      <div className="post-missing">
        <p>report not found.</p>
        <Link to="/writing" className="hlink">← back to writing</Link>
      </div>
    )
  }

  return (
    <div className="post">
      {headings.length > 0 && (
        <aside className="post-nav">
          <Link to="/writing" className="post-back">← back</Link>
          <nav>
            {headings.map(h => (
              <a key={h.id} href={`#${h.id}`} className={active === h.id ? 'active' : ''}>{h.text}</a>
            ))}
          </nav>
        </aside>
      )}
      <article className="post-body" ref={articleRef}>
        {headings.length === 0 && <Link to="/writing" className="post-back">← back</Link>}
        <h1>{post.title}</h1>
        <p className="post-meta">
          {post.date}{post.sector ? ` · [${post.sector}]` : ''}
        </p>
        {post.summary && <p className="post-sub">{post.summary}</p>}
        <div className="post-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
