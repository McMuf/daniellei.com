import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { profile } from '../data/profile'
import { posts } from '../lib/posts'

type Command = {
  id: string
  label: string
  hint?: string
  group: string
  run: () => void
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const shortcutLabel = isMac ? '⌘K' : 'Ctrl K'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'home', label: 'home', group: 'go', run: () => navigate('/') },
      { id: 'work', label: 'work', group: 'go', run: () => navigate('/work') },
      { id: 'projects', label: 'projects', group: 'go', run: () => navigate('/projects') },
      { id: 'writing', label: 'writing', group: 'go', run: () => navigate('/writing') },
    ]
    const writing: Command[] = posts.map(p => ({
      id: `post-${p.slug}`,
      label: p.title,
      hint: p.date,
      group: 'writing',
      run: () => navigate(`/writing/${p.slug}`),
    }))
    const links: Command[] = [
      ...profile.social.map(s => ({
        id: `social-${s.label}`,
        label: s.label,
        group: 'link',
        run: () => window.open(s.url, '_blank', 'noopener,noreferrer'),
      })),
      {
        id: 'email',
        label: profile.email,
        group: 'link',
        run: () => { window.location.href = `mailto:${profile.email}` },
      },
    ]
    return [...nav, ...writing, ...links]
  }, [navigate])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(c => c.label.toLowerCase().includes(q) || c.group.includes(q))
  }, [commands, query])

  const close = () => {
    setOpen(false)
    setQuery('')
    setSelected(0)
  }

  const run = (cmd: Command) => {
    cmd.run()
    close()
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        return
      }
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(i => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = results[selected]
        if (cmd) run(cmd)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, selected])

  useEffect(() => { setSelected(0) }, [query])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  return (
    <>
      <button
        type="button"
        className="cmdk-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        {shortcutLabel}
      </button>

      {open && (
        <div className="cmdk-backdrop" onClick={close}>
          <div
            className="cmdk-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            onClick={e => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className="cmdk-input"
              placeholder="jump to…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <div className="cmdk-list">
              {results.length === 0 && <div className="cmdk-empty">no matches</div>}
              {results.map((cmd, i) => (
                <button
                  key={cmd.id}
                  type="button"
                  className={`cmdk-item${i === selected ? ' active' : ''}`}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => run(cmd)}
                >
                  <span className="cmdk-item-group">{cmd.group}</span>
                  <span className="cmdk-item-label">{cmd.label}</span>
                  {cmd.hint && <span className="cmdk-item-hint">{cmd.hint}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
