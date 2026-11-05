import { useEffect, useMemo, useRef, useState } from 'react'
import { STANDARD_AREAS } from './cstaStandards.js'
import { readAssignment, writeAssignment } from './assignmentStore.js'

// Teacher picks the CSTA High School Specialty standards a student should learn.
// Grouped by subarea (Artificial Intelligence, Cybersecurity) exactly like the
// CSTA "High School Specialty" view. The selected standards become the skills on
// the student's skill tree (saved per student via assignmentStore).
export default function StandardsPicker({ student, onClose, onSaved }) {
  const [selected, setSelected] = useState(() => new Set(readAssignment(student.id)))
  const ref = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    ref.current?.querySelector('input, button')?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [onClose])

  const totalSelected = selected.size

  const toggle = (code) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(code)) next.delete(code); else next.add(code)
    return next
  })

  const areaStats = useMemo(() => STANDARD_AREAS.map((a) => ({
    id: a.id,
    label: a.label,
    total: a.standards.length,
    chosen: a.standards.filter((s) => selected.has(s.code)).length,
  })), [selected])

  const toggleArea = (areaId, on) => setSelected((prev) => {
    const next = new Set(prev)
    const area = STANDARD_AREAS.find((a) => a.id === areaId)
    area.standards.forEach((s) => { if (on) next.add(s.code); else next.delete(s.code) })
    return next
  })

  function save() {
    // Preserve a stable order: area order, then standard order.
    const ordered = STANDARD_AREAS.flatMap((a) => a.standards.filter((s) => selected.has(s.code)).map((s) => s.code))
    writeAssignment(student.id, ordered)
    onSaved?.(ordered.length)
    onClose()
  }

  return (
    <div className="tv-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sp" role="dialog" aria-modal="true" aria-labelledby="sp-title" ref={ref}>
        <header className="sp-head">
          <div>
            <p className="sp-eyebrow">CSTA 2026 · High School Specialty</p>
            <h2 id="sp-title" className="sp-title">Choose what {student.name} should learn</h2>
            <p className="sp-sub">The standards you select become the skills on {student.name}&apos;s skill tree.</p>
          </div>
          <button type="button" className="sp-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="sp-body">
          {STANDARD_AREAS.map((area) => {
            const stat = areaStats.find((s) => s.id === area.id)
            const allOn = stat.chosen === stat.total
            return (
              <section key={area.id} className="sp-area" aria-labelledby={`sp-area-${area.id}`}>
                <div className="sp-area-head">
                  <label className="sp-area-toggle">
                    <input
                      type="checkbox"
                      checked={allOn}
                      ref={(el) => { if (el) el.indeterminate = stat.chosen > 0 && !allOn }}
                      onChange={(e) => toggleArea(area.id, e.target.checked)}
                    />
                    <span id={`sp-area-${area.id}`} className="sp-area-label">{area.label}</span>
                  </label>
                  <span className="sp-area-count">{stat.chosen} / {stat.total} selected</span>
                </div>
                <ul className="sp-list">
                  {area.standards.map((s) => (
                    <li key={s.code}>
                      <label className="sp-item">
                        <input type="checkbox" checked={selected.has(s.code)} onChange={() => toggle(s.code)} />
                        <span className="sp-item-text">
                          <span className="sp-code">{s.code}</span>
                          <span className="sp-statement">{s.statement}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>

        <footer className="sp-foot">
          <span className="sp-foot-count" role="status">{totalSelected} standard{totalSelected === 1 ? '' : 's'} selected</span>
          <div className="sp-foot-actions">
            <button type="button" className="tv-btn tv-btn--light" onClick={onClose}>Cancel</button>
            <button type="button" className="tv-btn tv-btn--blue" onClick={save}>Assign to skill tree</button>
          </div>
        </footer>
      </div>
    </div>
  )
}
