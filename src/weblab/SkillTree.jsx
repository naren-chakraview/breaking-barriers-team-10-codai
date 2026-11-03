import { useState } from 'react'
import { CLUSTERS, NODES, EDGES, CANVAS, getNode } from './skillTreeData.js'

// Skill-tree / map view modeled on the CodeAI studio reference. Data-driven
// from skillTreeData.js. Each node renders exactly one label (left/right/below)
// so nothing overlaps; edges route orthogonally between node edges.
export default function SkillTree({ user, onExit, onOpenLesson }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  const nodeRadius = (n) => (n.big ? 22 : 18)

  function onNodeClick(n) {
    if (n.state === 'locked') return
    setSelected(n.id)
  }

  // An edge leaves one node and enters another; stop a few px short of the
  // circle so lines meet the rim, not the center. We route horizontal→vertical
  // through the midpoint-x for a tidy right-angle look.
  function edgePath(from, to) {
    const a = getNode(from)
    const b = getNode(to)
    if (!a || !b) return ''
    const midX = (a.x + b.x) / 2
    return `M ${a.x} ${a.y} H ${midX} V ${b.y} H ${b.x}`
  }

  return (
    <div className="st">
      <header className="ca-topbar">
        <div className="ca-logo">CODE<span className="ca-logo-tri">∆</span>I</div>
        <div className="ca-topbar-center">
          <button type="button" className="ca-pill">Skill Tree: Hour of AI 2026 - Adaptive ☁</button>
          <button type="button" className="ca-pill ca-pill--project" onClick={onExit}>I'm finished! →</button>
        </div>
        <div className="ca-topbar-right">
          <div className="ca-user" onClick={() => setMenuOpen((o) => !o)}>
            {user?.username || 'Student'} ▾
            {menuOpen && (
              <div className="ca-user-menu">
                <button type="button" onClick={onExit}>Exit to dashboard</button>
              </div>
            )}
          </div>
          <button type="button" className="ca-icon" aria-label="Help">?</button>
          <button type="button" className="ca-icon" aria-label="Menu">☰</button>
        </div>
      </header>

      <div className="st-subbar">Hour of AI 2026 - Adaptive</div>

      <div className="st-body">
        <div className="st-canvas-wrap">
          <svg
            className="st-canvas"
            viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Skill tree"
          >
            {/* Cluster boxes */}
            {CLUSTERS.map((c) => (
              <g key={c.id}>
                <rect className="st-cluster-box" x={c.box.x} y={c.box.y} width={c.box.w} height={c.box.h} rx="12" />
                <text className="st-cluster-label" x={c.box.x + c.box.w / 2} y={c.box.y + 20}>{c.label}</text>
              </g>
            ))}

            {/* Edges (under nodes) */}
            {EDGES.map((e, i) => (
              <path key={i} className={`st-edge ${e.locked ? 'st-edge--locked' : ''}`} d={edgePath(e.from, e.to)} fill="none" />
            ))}

            {/* Nodes */}
            {NODES.map((n) => {
              const r = nodeRadius(n)
              const clickable = n.state !== 'locked'
              const isSel = selected === n.id

              // Single label, positioned per node.
              let lx = 0, ly = 0, anchor = 'middle'
              if (n.labelPos === 'left') { lx = -(r + 10); anchor = 'end' }
              else if (n.labelPos === 'right') { lx = r + 10; anchor = 'start' }
              else { ly = r + 16; anchor = 'middle' } // below

              return (
                <g
                  key={n.id}
                  className={`st-node st-node--${n.state} ${clickable ? 'is-clickable' : ''} ${isSel ? 'is-selected' : ''}`}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={() => onNodeClick(n)}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  aria-label={`${n.title} (${n.state})`}
                  onKeyDown={(ev) => {
                    if (clickable && (ev.key === 'Enter' || ev.key === ' ')) {
                      ev.preventDefault()
                      onNodeClick(n)
                    }
                  }}
                >
                  <circle className="st-node-circle" r={r} />
                  <text className="st-node-icon" x="0" y="0" textAnchor="middle" dominantBaseline="central">{n.icon}</text>
                  <text className="st-node-label" x={lx} y={ly} textAnchor={anchor} dominantBaseline="central">{n.title}</text>
                </g>
              )
            })}
          </svg>

          <div className="st-zoom">
            <button type="button" aria-label="Zoom in">⊕</button>
            <button type="button" aria-label="Zoom out">⊖</button>
          </div>
        </div>

        <aside className="st-project">
          <div className="st-project-head">MY PROJECT</div>
          <h2 className="st-project-title">New Project</h2>
          <p className="st-project-desc">Add details about your project vision here!</p>
          <button type="button" className="ca-btn ca-btn--primary st-project-cta" onClick={onOpenLesson}>Work on my Project</button>

          {selected && (
            <div className="st-selected">
              <p className="st-selected-label">Selected skill</p>
              <p className="st-selected-title">{getNode(selected)?.title}</p>
              <button type="button" className="ca-btn ca-btn--outline ca-btn--sm" onClick={onOpenLesson}>Start this skill →</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
