// Decorative, experiences-page-only background: a few columns of a fake build/
// deploy log scrolling upward at their own speed, like `tail -f` panes.
// Pure CSS loop (each column renders its lines twice back-to-back and
// translates by -50%) so nothing needs to run in JS.

const LOG_LINES = [
  '$ git pull origin main',
  'Already up to date.',
  '$ npm install',
  'added 342 packages in 4.1s',
  '$ npm run build',
  '✓ built in 2.4s',
  '$ npm test',
  '128 passed, 0 failed',
  '$ git commit -m "update"',
  '$ git push origin main',
  'Enumerating objects: 12, done.',
  '$ deploy staging',
  'Deployment successful',
  'status: 200 OK',
  '$ curl /api/health',
  '{"status":"ok"}',
  'uptime: 14d 06h 22m',
  '$ tail -f app.log',
  '[INFO] server started on :3000',
  '[INFO] request GET /',
  '[WARN] cache miss',
]

const COLUMNS = [
  { left: '4%', duration: 34, delay: -4 },
  { left: '27%', duration: 40, delay: -18 },
  { left: '50%', duration: 30, delay: -9 },
  { left: '73%', duration: 38, delay: -25 },
  { left: '92%', duration: 33, delay: -14 },
]

export default function TerminalBackground() {
  return (
    <div className="terminal-bg" aria-hidden="true">
      {COLUMNS.map((c, i) => (
        <div
          key={i}
          className="terminal-col"
          style={{ left: c.left, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
        >
          <div className="terminal-lines">
            {LOG_LINES.map((line, j) => (
              <div key={j} className={line.startsWith('$') ? 'terminal-cmd' : undefined}>{line}</div>
            ))}
          </div>
          <div className="terminal-lines">
            {LOG_LINES.map((line, j) => (
              <div key={j} className={line.startsWith('$') ? 'terminal-cmd' : undefined}>{line}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
