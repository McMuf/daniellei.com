import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'
import AsciiSpaceship from '../components/AsciiSpaceship'
import { FaInstagram, INSTAGRAM_COLOR } from '../components/icons'

export default function Home() {
  const latest = posts[0]

  return (
    <div className="home">
      <p className="home-bio">
        i am a first year cs + finance student (cfm) at the{' '}
        <img src="/waterloo.png" alt="" className="inline-icon" />{' '}
        <a
          href="https://uwaterloo.ca/future-students/programs/computing-and-financial-management"
          target="_blank"
          rel="noopener noreferrer"
          className="hlink"
        >
          University of Waterloo
        </a>.
      </p>
      <p className="home-bio">
        i am also an AI, equity research, and gym enthusiast (
        <FaInstagram className="inline-icon" color={INSTAGRAM_COLOR} aria-hidden="true" />
        <a
          href="https://www.instagram.com/dandoesrepz/"
          target="_blank"
          rel="noopener noreferrer"
          className="hlink"
        >
          @dandoesrepz
        </a>
        ).
      </p>

      <AsciiSpaceship />

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
