import { useEffect, useRef } from 'react'
import { SCENARIOS } from './demoScripts.js'

// Small dialog opened by "Play demo": pick which student to watch.
export default function DemoPicker({ onStart, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    ref.current?.querySelector('button')?.focus()
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const items = [...ref.current.querySelectorAll('button')]
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [onClose])

  return (
    <div className="demo-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="demo-picker" role="dialog" aria-modal="true" aria-labelledby="demo-picker-title" ref={ref}>
        <h2 id="demo-picker-title">Watch the lesson adapt</h2>
        <p className="demo-picker-sub">
          A short automatic walkthrough, as if you were the student: asking for hints, and the lesson
          getting slower or harder depending on how it goes. Your own lesson is not changed.
        </p>
        <div className="demo-picker-cards">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" className={`demo-card demo-card--${s.id}`} onClick={() => onStart(s)}>
              <span className="demo-card-name">{s.name}</span>
              <span className="demo-card-tag">{s.tagline}</span>
              <span className="demo-card-blurb">{s.blurb}</span>
              <span className="demo-card-go"><span aria-hidden="true">▶</span> Play</span>
            </button>
          ))}
        </div>
        <button type="button" className="demo-picker-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
