import { projects } from '../data/projects'
import { TAG_ICONS, TAG_ICON_COLORS } from '../components/icons'
import MatrixBackground from '../components/MatrixBackground'

export default function Projects() {
  return (
    <>
      <MatrixBackground />
      <div className="project-grid">
        {projects.map(p => {
          const Wrapper = p.url ? 'a' : 'div'
          return (
            <Wrapper
              key={p.title}
              className="pcard"
              {...(p.url ? { href: p.url, target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              <h3 className="pcard-title">{p.title}</h3>
              {p.year && <p className="pcard-meta">{p.year}</p>}
              <p className="pcard-desc">{p.description}</p>
              {p.tags && (
                <p className="pcard-tags">
                  {p.tags.map(t => {
                    const Icon = TAG_ICONS[t]
                    return Icon
                      ? <Icon key={t} className="tag-icon" color={TAG_ICON_COLORS[t]} title={t} aria-label={t} />
                      : <span key={t} className="tag">{t}</span>
                  })}
                </p>
              )}
            </Wrapper>
          )
        })}
      </div>
    </>
  )
}
