import { Link } from 'react-router-dom'
import { posts } from '../lib/posts'
import { profile } from '../data/profile'
import AsciiRunner from '../components/AsciiRunner'

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

export default function Home() {
  const latest = posts[0]

  return (
    <>
      <AsciiRunner />

      <img src="/myself.png" alt="Daniel Lei" className="avatar" />
      <h1>hi, my name is Daniel</h1>
      <p className="intro">cs + finance student building where markets meet code</p>

      <section>
        <h2>currently</h2>
        <ul>
          <li>
            software engineer @ <a className="name" href="https://www.marbleinvestments.ca/" {...ext}>Marble Investments</a> · $2M student-run fund
          </li>
          <li>
            CS + Finance (CFM) @{' '}
            <a className="name" href="https://uwaterloo.ca/future-students/programs/computing-and-financial-management" {...ext}>
              <img className="logo" src="/uwaterloofinal.png" alt="" />UWaterloo
            </a>
          </li>
          <li className="subpoint">
            <span className="tip" tabIndex={0} data-tip="University of Waterloo entrance award">President’s Scholarship of Distinction</span>
          </li>
          <li>
            posting the journey @ <a className="name" href={profile.instagram.url} {...ext}>{profile.instagram.handle}</a> · 1M+ organic views
          </li>
        </ul>
      </section>

      <section>
        <h2>building</h2>
        <ul>
          <li>
            <Link className="name" to="/projects">Spillover</Link>, an open ledger testing how news spills over into markets
          </li>
          <li>
            <Link className="name" to="/projects">Cospray</Link>, multiplayer AR graffiti · 50+ beta testers
          </li>
        </ul>
      </section>

      <section>
        <h2>highlights</h2>
        <ul>
          <li>Best Mobile Experience Built with Expo @ <span className="name">Hack the North 2026</span> for Cospray</li>
          <li>selected for <span className="name">SIG</span>’s Virtual Discovery Program · quant trading &amp; market making</li>
          <li>screening signals behind $15,000+ in alpha @ <span className="name">Marble</span></li>
          <li>chair @ <a className="name" href="https://vshacks.com/" {...ext}>vsHacks</a> · 400+ hackers, $7,000+ in prizes</li>
          <li>co-founded <a className="name" href="https://conceptusfoundation.org/" {...ext}>Conceptus Foundation</a> · STEM nonprofit, 90,000+ reach</li>
        </ul>
      </section>

      {latest && (
        <section>
          <h2>latest writing</h2>
          <ul>
            <li>
              <Link className="name" to={`/blog/${latest.slug}`}>{latest.title}</Link> · {latest.date}
            </li>
          </ul>
        </section>
      )}

      <nav className="links" aria-label="Elsewhere">
        {profile.social.map(s => (
          <a key={s.label} href={s.url} {...ext}>{s.label}</a>
        ))}
        <a href={`mailto:${profile.email}`}>email</a>
      </nav>
    </>
  )
}
