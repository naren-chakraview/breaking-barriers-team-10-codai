import { STATUS } from './teacherData.js'

// Left column: the whole class. Search, class-average mastery, one row per
// student (avatar, level, mastery bar, status pill) and a legend. A student's
// detail opens on DOUBLE-CLICK (per the design). For keyboard users, pressing
// Enter on a focused row opens it too.
export default function Roster({ all, visible, query, onQuery, selectedId, onOpen, classLabel }) {
  const avg = all.length ? Math.round(all.reduce((s, st) => s + st.mastery, 0) / all.length) : 0

  return (
    <aside className="tv-card tv-roster" aria-label="Student roster">
      <h2 className="tv-eyebrow">STUDENTS</h2>
      <p className="tv-muted">{classLabel} · {all.length} students · double-click to open</p>

      <label className="tv-sr" htmlFor="tv-search">Search students</label>
      <input
        id="tv-search"
        className="tv-search"
        type="search"
        placeholder="Search students..."
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />

      <div className="tv-avg">
        <div className="tv-avg-row">
          <span>Class avg mastery</span>
          <strong>{avg}%</strong>
        </div>
        <div className="tv-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avg} aria-label="Class average mastery">
          <div className="tv-bar-fill tv-bar-fill--blue" style={{ width: `${avg}%` }} />
        </div>
      </div>

      <div className="tv-cols" aria-hidden="true">
        <span>NAME</span><span>MASTERY</span><span>STATUS</span>
      </div>

      <ul className="tv-rows">
        {visible.map((s) => {
          const st = STATUS[s.status]
          const selected = s.id === selectedId
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`tv-row ${selected ? 'is-selected' : ''}`}
                aria-current={selected ? 'true' : undefined}
                aria-label={`${s.name}, ${s.levelLabel}, mastery ${s.mastery} percent, ${st.label}. Double-click or press Enter to open.`}
                onDoubleClick={() => onOpen(s.id)}
                onClick={(e) => { if (e.detail === 0) onOpen(s.id) }}
              >
                <span className={`tv-avatar ${selected ? 'tv-avatar--blue' : ''}`} aria-hidden="true">{s.initials}</span>
                <span className="tv-row-main">
                  <span className="tv-row-name">{s.name}</span>
                  <span className="tv-row-sub">{s.levelLabel}</span>
                </span>
                <span className="tv-bar tv-bar--sm" aria-hidden="true">
                  <span className={`tv-bar-fill tv-bar-fill--${st.tone}`} style={{ width: `${s.mastery}%` }} />
                </span>
                <span className={`tv-status tv-status--${st.tone}`}>
                  <i aria-hidden="true" />{st.label}
                </span>
              </button>
            </li>
          )
        })}
        {visible.length === 0 && <li className="tv-none">No students match “{query}”.</li>}
      </ul>

      <div className="tv-legend" aria-label="Status legend">
        <span>Legend:</span>
        <span className="tv-status tv-status--good"><i />on track</span>
        <span className="tv-status tv-status--warn"><i />stuck</span>
        <span className="tv-status tv-status--bad"><i />behind</span>
      </div>
    </aside>
  )
}
