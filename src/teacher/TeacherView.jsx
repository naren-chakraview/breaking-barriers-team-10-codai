import { useCallback, useEffect, useRef, useState } from 'react'
import './teacher.css'
import { BrandMark } from '../Brand.jsx'
import { INITIAL_STUDENTS, SKILLS, STATUS, skillStates, overallScore, letterFor } from './teacherData.js'
import Roster from './Roster.jsx'
import StudentSummary from './StudentSummary.jsx'
import HelpPanel from './HelpPanel.jsx'
import ComposeModal from './ComposeModal.jsx'

const CLASS_LABEL = 'Class 7B'

// "ms.r@school.edu" -> "MR", "rgonzales" -> "RG"
function initialsFor(name = '') {
  const local = name.split('@')[0]
  const parts = local.split(/[._\-\s]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase() || 'T'
}
const MODULE = 'Module 2 — Build a personal site'

// Spreadsheet-safe CSV cell (also neutralises formula-looking text).
function csvCell(v) {
  let s = String(v)
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

// Teacher view of a lesson (teacher-view-design.md): whole class on the left,
// a single student's detail on the right (opened by double-click). All data is
// mock and held in component state; nothing here reaches the student view.
export default function TeacherView({ user, onLogout }) {
  const [students, setStudents] = useState(INITIAL_STUDENTS)
  const [selectedId, setSelectedId] = useState(INITIAL_STUDENTS[0].id)
  const [query, setQuery] = useState('')
  const [compose, setCompose] = useState(null) // 'message' | 'hint' | null
  const [toast, setToast] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const toastTimer = useRef(null)
  const flash = useCallback((msg, ms = 4000) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }, [])
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const update = (id, fn) => setStudents((list) => list.map((s) => (s.id === id ? fn(s) : s)))
  const updateHelp = (id, patch) => update(id, (s) => ({ ...s, help: { ...s.help, ...patch } }))

  // Live countdown: students on the "additional hint" rung count down to the
  // timed reveal of the worked solution.
  useEffect(() => {
    const t = setInterval(() => {
      setStudents((list) => {
        if (!list.some((s) => s.help.stage === 3)) return list
        return list.map((s) => {
          if (s.help.stage !== 3) return s
          const remaining = s.help.remaining - 1
          if (remaining <= 0) return { ...s, help: { ...s.help, remaining: 0, stage: 4, reason: 'timer' } }
          return { ...s, help: { ...s.help, remaining } }
        })
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Announce reveals caused by the timer.
  const prevStage = useRef(Object.fromEntries(INITIAL_STUDENTS.map((s) => [s.id, s.help.stage])))
  useEffect(() => {
    students.forEach((s) => {
      if (prevStage.current[s.id] === 3 && s.help.stage === 4 && s.help.reason === 'timer') {
        flash(`Timeout reached — the answer was revealed to ${s.name}.`, 6000)
      }
      prevStage.current[s.id] = s.help.stage
    })
  }, [students, flash])

  const selected = students.find((s) => s.id === selectedId) || null
  const q = query.trim().toLowerCase()
  const visible = q ? students.filter((s) => s.name.toLowerCase().includes(q)) : students

  function revealNow() {
    if (!selected) return
    if (!window.confirm(`Reveal the worked solution to ${selected.name} now?`)) return
    updateHelp(selected.id, { stage: 4, reason: 'teacher', remaining: 0 })
    flash(`Answer revealed to ${selected.name}.`)
  }
  function setTimeoutMin(min) {
    if (!selected) return
    updateHelp(selected.id, {
      timeoutMin: min,
      remaining: selected.help.stage === 3 ? min * 60 : selected.help.remaining,
    })
  }
  function toggleSeeAnswer() {
    if (selected) updateHelp(selected.id, { seeAnswer: !selected.help.seeAnswer })
  }
  function sendHint(text) {
    updateHelp(selected.id, { sentHints: [...selected.help.sentHints, text] })
    setCompose(null)
    flash(`Hint recorded for ${selected.name} (demo - not delivered).`)
  }
  function sendMessage() {
    setCompose(null)
    flash(`Message recorded for ${selected.name} (demo - not delivered).`)
  }
  function overrideGrade(score) {
    update(selected.id, (s) => ({ ...s, gradeOverride: score }))
    flash(score == null ? 'Grade reset to the automatic score.' : `Grade set to ${letterFor(score)} · ${score}% — this is what feeds the agent.`)
  }

  function exportReport() {
    const head = ['Name', 'Level', 'Mastery %', 'Status', 'Skills mastered', 'Hints used', 'Minutes on task', 'Overall grade']
    const rows = students.map((s) => {
      const score = s.gradeOverride ?? overallScore(s.ratings)
      const mastered = skillStates(s.level).filter((k) => k.state === 'mastered').length
      return [s.name, s.levelLabel, s.mastery, STATUS[s.status].label, `${mastered}/${SKILLS.length}`, s.hintsUsed, s.minutes, `${letterFor(score)} (${score}%)`]
    })
    const csv = [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      flash('Export is not supported in this browser.')
      return
    }
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'class-7b-report.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    flash('Class report exported (class-7b-report.csv).')
  }

  const initials = initialsFor(user?.username)

  return (
    <div className="tv">
      <header className="tv-top">
        <div className="tv-brand">
          <BrandMark size={30} />
          <span className="tv-brand-name">AdaptAI</span>
          <span className="tv-context">Teacher · {MODULE}</span>
        </div>
        <div className="tv-top-actions">
          <button type="button" className="tv-btn tv-btn--light" onClick={exportReport}>Export class report</button>
          <div className="tv-user" ref={menuRef}>
            <button
              type="button"
              className="tv-avatar tv-avatar--top tv-avatar-btn"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Account menu for ${user?.username || 'teacher'}`}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {initials}
            </button>
            {menuOpen && (
              <div className="tv-menu" role="menu">
                <button type="button" role="menuitem" className="tv-menuitem" onClick={onLogout}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {toast && <div className="tv-toast" role="status">{toast}</div>}

      <main className="tv-grid">
        <Roster
          all={students}
          visible={visible}
          query={query}
          onQuery={setQuery}
          selectedId={selectedId}
          onOpen={setSelectedId}
          classLabel={CLASS_LABEL}
        />

        <section className="tv-card tv-detail" aria-label="Student detail">
          {selected && (
            <>
              <div className="tv-detail-head">
                <span className="tv-avatar tv-avatar--blue tv-avatar--lg" aria-hidden="true">{selected.initials}</span>
                <div className="tv-detail-who">
                  <h2 className="tv-name">{selected.name}</h2>
                  <p className="tv-muted">{CLASS_LABEL} · opened via double-click · Module 2 “Build a personal site”</p>
                </div>
                <button type="button" className="tv-btn tv-btn--light tv-btn--wide" onClick={() => setCompose('message')}>Message student</button>
              </div>
              <div className="tv-detail-cols">
                <StudentSummary key={selected.id} student={selected} onOverrideGrade={overrideGrade} />
                <HelpPanel
                  student={selected}
                  onRevealNow={revealNow}
                  onSendHint={() => setCompose('hint')}
                  onTimeout={setTimeoutMin}
                  onToggleSeeAnswer={toggleSeeAnswer}
                />
              </div>
            </>
          )}
        </section>
      </main>

      {compose === 'message' && selected && (
        <ComposeModal
          title={`Message ${selected.name}`}
          help="Demo only: your message is recorded here but not delivered to the student yet."
          submitLabel="Send message"
          onSubmit={sendMessage}
          onClose={() => setCompose(null)}
        />
      )}
      {compose === 'hint' && selected && (
        <ComposeModal
          title={`Send a custom hint to ${selected.name}`}
          help="Write a nudge in your own words. It adds to the help ladder, it does not skip it. Demo only: not delivered to the student yet."
          submitLabel="Send hint"
          onSubmit={sendHint}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  )
}
