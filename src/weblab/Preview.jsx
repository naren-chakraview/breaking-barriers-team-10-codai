import { useMemo } from 'react'

// Right column: a browser-style preview matching the CodeAI Web Lab layout —
// a toolbar (nav arrows, URL field, refresh, run) above the rendered page.
// The iframe is sandboxed WITHOUT allow-scripts, so student HTML/CSS renders
// safely (JS does not execute) — consistent with Web Lab's HTML/CSS focus.
export default function Preview({ html, css, onRun, outOfDate }) {
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8"><style>${css || ''}</style></head><body>${html || ''}</body></html>`,
    [html, css],
  )

  return (
    <div className="ca-preview">
      <div className="ca-browserbar">
        <div className="ca-browser-nav">
          <button type="button" aria-label="Back" disabled>‹</button>
          <button type="button" aria-label="Forward" disabled>›</button>
        </div>
        <div className="ca-browser-url">index.html</div>
        <div className="ca-browser-actions">
          <button type="button" className="ca-browser-run" onClick={onRun} title="Run" aria-label="Run">
            {outOfDate ? '●' : '▸'}
          </button>
          <span className="ca-browser-icons" aria-hidden="true">🖥 📱</span>
        </div>
      </div>
      <iframe
        className="ca-preview-iframe"
        title="Live preview of your website"
        sandbox=""
        srcDoc={srcDoc}
      />
    </div>
  )
}
