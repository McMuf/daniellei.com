import { jobs, programs } from '../data/experience'

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

export default function Experience() {
  return (
    <>
      <h1 className="page-title">experience</h1>
      <p className="page-sub">where I’ve worked, built and led</p>

      <div className="rows">
        {jobs.map(j => (
          <article key={j.company + j.period} className="row">
            <header>
              <h3>{j.url ? <a href={j.url} {...ext}>{j.company}</a> : j.company}</h3>
              <span className="when">{j.period} · {j.role}</span>
            </header>
            {j.summary && <p className="summary">{j.summary}</p>}
            {j.bullets && (
              <ul>
                {j.bullets.map(b => <li key={b}>{b}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>

      <h2 className="rows-label">programs</h2>
      <div className="rows">
        {programs.map(p => (
          <article key={p.org} className="row">
            <header>
              <h3>{p.url ? <a href={p.url} {...ext}>{p.org}</a> : p.org}</h3>
              <span className="when">{p.period} · {p.role}</span>
            </header>
            <p className="summary">{p.summary}</p>
          </article>
        ))}
      </div>
    </>
  )
}
