import { projects } from '../data/projects'
import LoopVideo from '../components/LoopVideo'

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

export default function Projects() {
  return (
    <>
      <h1 className="page-title">projects</h1>
      <p className="page-sub">things I’ve shipped, and a few hackathon weekends</p>

      <div className="rows">
        {projects.map(p => (
          <article key={p.title} className={`row${p.video ? ' has-clip' : ''}`}>
            <div className="row-body">
              <header>
                <h3>{p.url ? <a href={p.url} {...ext}>{p.title}</a> : p.title}</h3>
                <span className="when">{p.when}</span>
              </header>
              <p className="summary">{p.summary}</p>
              {p.bullets && (
                <ul>
                  {p.bullets.map(b => <li key={b}>{b}</li>)}
                </ul>
              )}
              <p className="meta">
                {p.stack && <span>{p.stack.join(' · ')}</span>}
                {p.url && <a href={p.url} {...ext}>{p.urlLabel ?? 'link'}</a>}
                {p.githubUrl && <a href={p.githubUrl} {...ext}>github</a>}
              </p>
            </div>
            {p.video && <LoopVideo src={p.video} label={`${p.title} demo`} />}
          </article>
        ))}
      </div>
    </>
  )
}
