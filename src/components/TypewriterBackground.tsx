import { useEffect, useState } from 'react'

// Decorative, blog-page-only background: an old-terminal typewriter effect
// that types out a few lines, pauses, backspaces through them (each
// character flashing red just before it's erased), then loops.

const LINES = [
  'hi my name is daniel.',
  'i am a first year cfm student at waterloo.',
  'and i like keyboards, comic books, ai, and finance.',
  'dont be a stranger and reach out to me!',
]

const FULL_TEXT = LINES.join('\n')
const TYPE_HOLD_MS = 1700
const DELETE_PAUSE_MS = 650
const FLASH_MS = 55

function typingDelay(justTyped: string) {
  if ('.!,'.includes(justTyped)) return 260
  if (justTyped === ' ') return 60
  return 34 + Math.random() * 40
}

type Phase = 'typing' | 'deleting'

export default function TypewriterBackground() {
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('typing')
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    let timer: number

    if (phase === 'typing') {
      if (count < FULL_TEXT.length) {
        timer = window.setTimeout(() => setCount(c => c + 1), typingDelay(FULL_TEXT[count]))
      } else {
        timer = window.setTimeout(() => setPhase('deleting'), TYPE_HOLD_MS)
      }
    } else {
      if (count === 0) {
        timer = window.setTimeout(() => setPhase('typing'), DELETE_PAUSE_MS)
      } else if (!flashing) {
        setFlashing(true)
      } else {
        timer = window.setTimeout(() => {
          setFlashing(false)
          setCount(c => c - 1)
        }, FLASH_MS)
      }
    }

    return () => window.clearTimeout(timer)
  }, [phase, count, flashing])

  const lines = FULL_TEXT.slice(0, count).split('\n')
  const lastLine = lines[lines.length - 1]

  return (
    <div className="type-bg" aria-hidden="true">
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1
        if (isLast && flashing && lastLine.length > 0) {
          return (
            <div key={i}>
              {line.slice(0, -1)}
              <span className="type-flash">{line.slice(-1)}</span>
            </div>
          )
        }
        return (
          <div key={i}>
            {line}
            {isLast && !flashing && <span className="type-cursor">█</span>}
          </div>
        )
      })}
    </div>
  )
}
