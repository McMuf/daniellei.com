import { jobs } from '../data/experience'

export default function Work() {
  return (
    <div className="jobs">
      {jobs.map(j => (
        <div key={j.company + j.period} className="job">
          <div className="job-main">
            <div className="job-head">
              {j.logo && <img src={j.logo} alt="" aria-hidden="true" className="job-logo" />}
              {j.url
                ? <a href={j.url} target="_blank" rel="noopener noreferrer" className="hlink">{j.company}</a>
                : <span>{j.company}</span>}
              <span className="job-role">{j.role}</span>
              <span className="job-period">{j.period}</span>
            </div>
            {j.description && <p className="job-description">{j.description}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
