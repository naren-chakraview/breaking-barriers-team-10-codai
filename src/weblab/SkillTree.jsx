import { useCallback, useMemo, useRef, useState } from 'react'
import {
  CLUSTERS, NODES, EDGES, CANVAS, getNode,
  NODE_META, STATE_META, treeProgress, neighborsOf, edgesTouching,
} from './skillTreeData.js'
import { BrandMark } from '../Brand.jsx'
import './skillTree.css'

// Interactive skill-tree map. Data-driven from skillTreeData.js. The SVG is a
// pan/zoom canvas: drag to pan, wheel or the +/- controls to zoom, click or
// keyboard-focus a node to inspect it. Hovering a node lights up the skills it
// connects to and dims the rest. All content is mocked (no backend).
const ORDERED = [...NODES].sort((a, b) => (STATE_META[a.state]?.order ?? 9) - (STATE_META[b.state]?.order ?? 9))

export default function SkillTree({ user, onExit, onOpenLesson }) {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Pan/zoom state expressed as a viewBox over the virtual canvas.
  const [view, setView] = useState({ x: 0, y: 0, w: CANVAS.w, h: CANVAS.h })
  const svgRef = useRef(null)
  const pan = useRef(null)

  const progress = useMemo(() => treeProgress(), [])
  const focus = hovered || selected
  const related = useMemo(() => (focus ? neighborsOf(focus) : null), [focus])
  const hotEdges = useMemo(() => new Set(focus ? edgesTouching(focus).map((e) => `${e.from}->${e.to}`) : []), [focus])

  const nodeRadius = (n) => (n.big ? 23 : 18)

  const onNodeClick = (n) => { if (n.state !== 'locked') setSelected(n.id) }

  // Curved edge: a quadratic through a perpendicular-ish midpoint for an organic
  // look instead of hard right angles.
  function edgePath(from, to) {
    const a = getNode(from); const b = getNode(to)
    if (!a || !b) return ''
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const dx = b.x - a.x; const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    // bend perpendicular to the line, scaled gently with distance
    const bend = Math.min(60, len * 0.18)
    const cx = mx + (-dy / len) * bend
    const cy = my + (dx / len) * bend
    return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
  }

  // --- Pan/zoom ---
  const clampZoom = (w) => Math.max(CANVAS.w * 0.4, Math.min(CANVAS.w * 1.4, w))
  function zoomBy(factor, cx = view.x + view.w / 2, cy = view.y + view.h / 2) {
    setView((v) => {
      const w = clampZoom(v.w * factor)
      const h = w * (CANVAS.h / CANVAS.w)
      // keep the zoom centre stable
      const x = cx - (cx - v.x) * (w / v.w)
      const y = cy - (cy - v.y) * (h / v.h)
      return { x, y, w, h }
    })
  }
  function onWheel(e) {
    e.preventDefault()
    const p = toCanvas(e.clientX, e.clientY)
    zoomBy(e.deltaY > 0 ? 1.1 : 0.9, p.x, p.y)
  }
  function toCanvas(clientX, clientY) {
    const r = svgRef.current.getBoundingClientRect()
    return {
      x: view.x + ((clientX - r.left) / r.width) * view.w,
      y: view.y + ((clientY - r.top) / r.height) * view.h,
    }
  }
  function onPointerDown(e) {
    if (e.target.closest('.stx-node')) return // let nodes handle their own clicks
    pan.current = { startX: e.clientX, startY: e.clientY, ox: view.x, oy: view.y }
    svgRef.current.setPointerCapture?.(e.pointerId)
  }
  function onPointerMove(e) {
    if (!pan.current) return
    const r = svgRef.current.getBoundingClientRect()
    const dx = ((e.clientX - pan.current.startX) / r.width) * view.w
    const dy = ((e.clientY - pan.current.startY) / r.height) * view.h
    setView((v) => ({ ...v, x: pan.current.ox - dx, y: pan.current.oy - dy }))
  }
  const onPointerUp = () => { pan.current = null }
  const resetView = useCallback(() => setView({ x: 0, y: 0, w: CANVAS.w, h: CANVAS.h }), [])

  const meta = selected ? { ...getNode(selected), ...NODE_META[selected] } : null

  return (
    <div className="stx">
      <header className="stx-top">
        <div className="stx-brand">
          <BrandMark size={30} />
          <span className="stx-brand-name">AdaptAI</span>
        </div>
        <div className="stx-top-title">Skill Tree · Hour of AI 2026 — Adaptive</div>
        <div className="stx-top-actions">
          <button type="button" className="stx-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
            {user?.username || 'Student'} ▾
          </button>
          {menuOpen && (
            <button type="button" className="stx-btn" onClick={onExit}>Exit to dashboard</button>
          )}
          <button type="button" className="stx-btn stx-btn--primary" onClick={onExit}>I'm finished! →</button>
        </div>
      </header>

      <div className="stx-stats" role="group" aria-label="Your progress">
        <div className="stx-progress-track">
          <div className="stx-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct} aria-label="Skills mastered">
            <div className="stx-progress-fill" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="stx-progress-pct">{progress.pct}% mastered</span>
        </div>
        <div className="stx-stat"><span className="stx-stat-dot stx-dot-done" /><b>{progress.done}</b><span>mastered</span></div>
        <div className="stx-stat"><span className="stx-stat-dot stx-dot-current" /><b>{progress.inProgress}</b><span>in progress</span></div>
        <div className="stx-stat"><span className="stx-stat-dot stx-dot-available" /><b>{progress.available}</b><span>ready</span></div>
        <div className="stx-stat"><span className="stx-stat-dot stx-dot-locked" /><b>{progress.locked}</b><span>locked</span></div>
      </div>

      <div className="stx-body">
        <div className="stx-canvas-wrap">
          <svg
            ref={svgRef}
            className={`stx-canvas ${pan.current ? 'is-panning' : ''}`}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="application"
            aria-label="Skill tree map. Drag to pan, scroll to zoom, Tab between skills."
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <defs>
              <linearGradient id="stxGreen" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#10b981" /><stop offset="1" stopColor="#34d399" />
              </linearGradient>
              <linearGradient id="stxBlue" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#3b82f6" /><stop offset="1" stopColor="#6366f1" />
              </linearGradient>
              <linearGradient id="stxAmber" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#fbbf24" />
              </linearGradient>
            </defs>

            {CLUSTERS.map((c) => (
              <g key={c.id}>
                <rect className="stx-cluster-box" x={c.box.x} y={c.box.y} width={c.box.w} height={c.box.h} rx="16" />
                <text className="stx-cluster-label" x={c.box.x + c.box.w / 2} y={c.box.y + 22}>{c.label}</text>
              </g>
            ))}

            {EDGES.map((e) => {
              const key = `${e.from}->${e.to}`
              const hot = hotEdges.has(key)
              const dim = focus && !hot
              const done = getNode(e.from)?.state === 'completed' && getNode(e.to)?.state === 'completed'
              const d = edgePath(e.from, e.to)
              return (
                <g key={key}>
                  <path
                    className={`stx-edge ${e.locked ? 'stx-edge--locked' : done ? 'stx-edge--done' : ''} ${hot ? 'is-hot' : ''} ${dim ? 'is-dim' : ''}`}
                    d={d}
                  />
                  {hot && !e.locked && <path className="stx-edge-flow" d={d} />}
                </g>
              )
            })}

            {NODES.map((n) => {
              const r = nodeRadius(n)
              const clickable = n.state !== 'locked'
              const isSel = selected === n.id
              const isHot = focus === n.id || (related && related.has(n.id))
              const isDim = focus && !isHot && focus !== n.id
              let lx = 0, ly = 0, anchor = 'middle'
              if (n.labelPos === 'left') { lx = -(r + 12); anchor = 'end' }
              else if (n.labelPos === 'right') { lx = r + 12; anchor = 'start' }
              else { ly = r + 18 }
              return (
                <g
                  key={n.id}
                  className={`stx-node stx-node--${n.state} ${clickable ? 'is-clickable' : ''} ${isSel ? 'is-selected' : ''} ${isHot ? 'is-hot' : ''} ${isDim ? 'is-dim' : ''} ${n.state === 'current' ? 'is-current' : ''}`}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={() => onNodeClick(n)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n.id)}
                  onBlur={() => setHovered(null)}
                  role={clickable ? 'button' : 'img'}
                  tabIndex={clickable ? 0 : -1}
                  aria-label={`${n.title}. ${STATE_META[n.state]?.label || n.state}.`}
                  onKeyDown={(ev) => {
                    if (clickable && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); onNodeClick(n) }
                  }}
                >
                  <circle className="stx-node-halo" r={r + 8} fill="rgba(167,139,250,0.35)" />
                  <circle className="stx-node-circle" r={r} />
                  <circle className="stx-node-ring" r={r - 3} />
                  <text className="stx-node-icon" x="0" y="0" textAnchor="middle" dominantBaseline="central">{n.icon}</text>
                  <text className="stx-node-label" x={lx} y={ly} textAnchor={anchor} dominantBaseline="central">{n.title}</text>
                </g>
              )
            })}
          </svg>

          <div className="stx-controls">
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(0.85)}>+</button>
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1.18)}>−</button>
            <button type="button" aria-label="Reset view" onClick={resetView}>⤢</button>
          </div>

          <div className="stx-legend" aria-hidden="true">
            <span><i className="stx-dot-done" />Mastered</span>
            <span><i className="stx-dot-current" />In progress</span>
            <span><i className="stx-dot-available" />Ready</span>
            <span><i className="stx-dot-locked" />Locked</span>
          </div>
          <p className="stx-hint">Drag to pan · scroll to zoom · click a skill for details</p>
        </div>

        <aside className="stx-side">
          <div>
            <p className="stx-side-head">My project</p>
            <h2 className="stx-project-title">New Project</h2>
            <p className="stx-project-desc">Follow the map to build it. Each skill you master lights up the next.</p>
          </div>
          <button type="button" className="stx-btn stx-btn--primary" onClick={onOpenLesson}>Work on my project →</button>

          <div className="stx-detail">
            {!meta ? (
              <p className="stx-detail-empty">Hover a skill to preview the path, or click one to see what it covers and jump in.</p>
            ) : (
              <>
                <span className={`stx-badge stx-badge--${meta.state}`}>{STATE_META[meta.state]?.label || meta.state}</span>
                <h3 className="stx-detail-title">{meta.title}</h3>
                <p className="stx-detail-meta">{meta.skill ? `${meta.skill} · ` : ''}{meta.mins ? `about ${meta.mins} min` : ''}</p>
                <p className="stx-detail-blurb">{meta.blurb || 'A skill on your path.'}</p>
                {related && related.size > 0 && (
                  <p className="stx-detail-links"><b>Connects to:</b> {[...related].map((id) => getNode(id)?.title).filter(Boolean).join(', ')}</p>
                )}
                {meta.state !== 'locked'
                  ? <button type="button" className="stx-btn stx-btn--primary" onClick={onOpenLesson}>Start this skill →</button>
                  : <p className="stx-detail-meta">Finish the skills leading here to unlock it.</p>}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
