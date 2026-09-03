import { projects } from '../data/projects'
import { TAG_ICONS, TAG_ICON_COLORS } from '../components/icons'
import MatrixBackground from '../components/MatrixBackground'

export default function Projects() {
  return (
    <>
      <MatrixBackground />
      <div className="project-grid">
        {projects.map(p => (
          <div key={p.title} className="pcard">
            <h3 className="pcard-title">
              {p.url
                ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a>
                : p.title}
            </h3>
            {p.year && <p className="pcard-meta">{p.year}</p>}
            <p className="pcard-desc">{p.description}</p>
            {p.tags && (
              <p className="pcard-tags">
                {p.tags.map(t => {
                  const Icon = TAG_ICONS[t]
                  return (
                    <span key={t} className="tag">
                      {Icon && <Icon className="tag-icon" color={TAG_ICON_COLORS[t]} aria-hidden="true" />}
                      {t}
                    </span>
                  )
                })}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
