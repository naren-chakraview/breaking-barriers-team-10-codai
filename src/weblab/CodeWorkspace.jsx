import CodeHint from './CodeHint.jsx'
import CodeHintCard from './CodeHintCard.jsx'

const FILES = ['index.html', 'styles.css']
const TABS = [
  { id: 'code', label: 'Code' },
  { id: 'files', label: 'Files' },
  { id: 'buildLog', label: 'Build log' },
]

// Center-bottom card from the wireframe: Code / Files / Build log tabs, the
// green Run / Build button, a dark line-numbered editor, an "editing" footer,
// and the build status strip with the sandbox URL. Extra learning controls
// (Undo, Reset, Show me where, Submit & continue) sit in one row under the
// editor so the wireframe's structure stays intact.
export default function CodeWorkspace({
  tab, onTab, activeFile, onActiveFile, files, activeCode, onChange,
  scrollTop, onScroll, codeTarget, showWhere, onToggleWhere,
  canUndo, onUndo, isDirty, onReset, phase, onRun, onSubmit,
  build, url, saveStatus, deployState, onShowLog,
}) {
  const busy = phase === 'validating' || phase === 'routing'
  const building = build.status === 'building'
  const lineCount = activeCode.split('\n').length

  const statusText = {
    idle: 'Not built yet — press Run / Build',
    building: 'Building…',
    passed: deployState === 'deployed' ? 'Build passed · deployed — live' : 'Build passed · deployed to sandbox',
    failed: `Build failed — ${build.log.filter((l) => l.trim().startsWith('error')).length} problem(s)`,
  }[build.status]

  return (
    <section className="wf-card wf-code" aria-label="Code and build">
      <div className="wf-code-head">
        <div className="wf-tabs" role="tablist" aria-label="Code views">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`wf-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`wf-panel-${t.id}`}
              className={`wf-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => onTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="wf-btn wf-btn--green" onClick={onRun} disabled={building}>
          {building ? 'Building…' : '▶ Run / Build'}
        </button>
      </div>

      {tab === 'code' && (
        <div id="wf-panel-code" role="tabpanel" aria-labelledby="wf-tab-code" className="wf-code-panel">
          <div className="wf-filepills" role="group" aria-label="Open file">
            {FILES.map((f) => (
              <button
                key={f}
                type="button"
                className={`wf-filepill ${activeFile === f ? 'is-active' : ''}`}
                aria-pressed={activeFile === f}
                onClick={() => onActiveFile(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="wf-editor">
            <div className="wf-gutter" aria-hidden="true">
              <div style={{ transform: `translateY(${-scrollTop}px)` }}>
                {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
              </div>
            </div>
            <textarea
              className="wf-textarea"
              aria-label={`${activeFile} editor`}
              spellCheck={false}
              value={activeCode}
              onChange={(e) => onChange(e.target.value)}
              onScroll={(e) => onScroll(e.target.scrollTop)}
            />
            {codeTarget && <CodeHint code={activeCode} target={codeTarget} scrollTop={scrollTop} />}
            <span className="wf-editor-foot" role="status">
              ▌ editing · {saveStatus === 'dirty' ? 'unsaved' : saveStatus === 'saving' ? 'saving…' : 'autosaved'}
            </span>
          </div>

          {codeTarget && <CodeHintCard target={codeTarget} />}
        </div>
      )}

      {tab === 'files' && (
        <div id="wf-panel-files" role="tabpanel" aria-labelledby="wf-tab-files" className="wf-code-panel">
          <ul className="wf-filelist">
            {FILES.map((f) => (
              <li key={f}>
                <span className="wf-filename">📄 {f}</span>
                <span className="wf-muted">{new Blob([files[f] || '']).size} bytes</span>
                <button type="button" className="wf-btn wf-btn--light wf-btn--xs" onClick={() => { onActiveFile(f); onTab('code') }}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'buildLog' && (
        <div id="wf-panel-buildLog" role="tabpanel" aria-labelledby="wf-tab-buildLog" className="wf-code-panel">
          <pre className="wf-log">
            {build.log.length === 0
              ? 'No builds yet. Press ▶ Run / Build to see what happens.'
              : build.log.map((line, i) => (
                  <span key={i} className={line.trim().startsWith('error') || line.includes('failed') ? 'wf-log-bad' : line.includes('passed') ? 'wf-log-ok' : ''}>
                    {line}{'\n'}
                  </span>
                ))}
          </pre>
        </div>
      )}

      <div className="wf-learnbar">
        <button type="button" className="wf-btn wf-btn--ghost wf-btn--xs" onClick={onUndo} disabled={!canUndo || busy} title="Step back one change">
          ↶ Undo
        </button>
        <button
          type="button"
          className="wf-btn wf-btn--ghost wf-btn--xs"
          onClick={() => { if (window.confirm('Clear your changes and start this step from the beginning?')) onReset() }}
          disabled={!isDirty || busy}
          title="Clear your changes and restore the starting code"
        >
          ⟲ Reset
        </button>
        <button
          type="button"
          className={`wf-btn wf-btn--xs ${showWhere ? 'wf-btn--blue' : 'wf-btn--light'}`}
          onClick={onToggleWhere}
          aria-pressed={showWhere}
        >
          {showWhere ? '✓ Showing where' : '📍 Show me where'}
        </button>
        <span className="wf-spacer" />
        <button type="button" className="wf-btn wf-btn--blue wf-btn--xs" onClick={onSubmit} disabled={busy}>
          {phase === 'validating' ? 'Checking…' : phase === 'routing' ? 'Finding next step…' : 'Submit & continue'}
        </button>
      </div>

      <div className="wf-strip" role="status" aria-live="polite">
        <span className={`wf-statusdot wf-statusdot--${build.status}`} aria-hidden="true" />
        <span className="wf-strip-text">
          {busy ? (phase === 'validating' ? 'AI is checking your work…' : 'Choosing your next step…') : statusText}
        </span>
        {build.status === 'failed' && (
          <button type="button" className="wf-link" onClick={onShowLog}>View Build log</button>
        )}
        {(build.status === 'passed') && <span className="wf-url">{url} ↗</span>}
      </div>
    </section>
  )
}
