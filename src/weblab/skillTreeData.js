// Skill-tree graph for "Hour of AI 2026 - Adaptive", modeled on the CodeAI
// studio reference. Positions are on a virtual canvas (x,y in px). Each node
// declares where its label sits ('left' | 'right' | 'below') so nothing
// overlaps. All content is mocked for the demo — no backend.
//
// state: 'completed' | 'current' | 'available' | 'locked'
// kind:  'skill' (clustered leaf) | 'milestone' (central spine)

export const CANVAS = { w: 1100, h: 720 }

export const CLUSTERS = [
  { id: 'interactive', label: 'Interactive Elements', box: { x: 60, y: 90, w: 210, h: 250 } },
  { id: 'story', label: 'Story & Message', box: { x: 60, y: 400, w: 210, h: 250 } },
  { id: 'style', label: 'Style & Design', box: { x: 830, y: 90, w: 210, h: 250 } },
  { id: 'hood', label: 'Under the Hood', box: { x: 830, y: 400, w: 210, h: 250 } },
]

export const NODES = [
  // --- Interactive Elements (left-top): labels to the LEFT of the node ---
  { id: 'list-pick', title: 'A list and a random pick', cluster: 'interactive', kind: 'skill', state: 'available', icon: '💬', x: 230, y: 150, labelPos: 'left' },
  { id: 'number-rule', title: 'A number and a rule', cluster: 'interactive', kind: 'skill', state: 'available', icon: '💬', x: 230, y: 215, labelPos: 'left' },
  { id: 'remember-show', title: 'Remember and show', cluster: 'interactive', kind: 'skill', state: 'available', icon: '💬', x: 230, y: 280, labelPos: 'left' },

  // --- Story & Message (left-bottom): labels LEFT ---
  { id: 'say-voice', title: 'Say it in your voice', cluster: 'story', kind: 'skill', state: 'available', icon: '🎨', x: 230, y: 460, labelPos: 'left' },
  { id: 'load-point', title: 'Load with the point', cluster: 'story', kind: 'skill', state: 'available', icon: '💬', x: 230, y: 525, labelPos: 'left' },
  { id: 'ask-clear', title: 'Make the ask clear', cluster: 'story', kind: 'skill', state: 'available', icon: '💬', x: 230, y: 590, labelPos: 'left' },

  // --- Central spine: labels BELOW, spaced out horizontally ---
  { id: 'use-lingo', title: 'Use the Lingo', kind: 'milestone', state: 'completed', icon: '💬', x: 380, y: 390, labelPos: 'below' },
  { id: 'intro', title: 'Intro', kind: 'milestone', state: 'completed', icon: '✓', x: 480, y: 390, big: true, labelPos: 'below' },
  { id: 'steer-it', title: 'Steer It', kind: 'milestone', state: 'available', icon: '🧭', x: 560, y: 300, labelPos: 'below' },
  { id: 'keep-redirect', title: 'Keep or Redirect', kind: 'milestone', state: 'available', icon: '🔀', x: 650, y: 300, labelPos: 'below' },
  { id: 'give-context', title: 'Give Context', kind: 'milestone', state: 'available', icon: '🧩', x: 560, y: 480, labelPos: 'below' },
  { id: 'check-fix', title: 'Check the Fix', kind: 'milestone', state: 'available', icon: '🐞', x: 650, y: 560, labelPos: 'below' },
  { id: 'show-off', title: 'Show it off', kind: 'milestone', state: 'locked', icon: '🔒', x: 650, y: 640, labelPos: 'below' },

  // --- Style & Design (right-top): labels to the RIGHT ---
  { id: 'layout-spacing', title: 'Layout and spacing', cluster: 'style', kind: 'skill', state: 'current', icon: '🎨', x: 870, y: 150, labelPos: 'right' },
  { id: 'style-consistency', title: 'Style and consistency', cluster: 'style', kind: 'skill', state: 'available', icon: '🎨', x: 870, y: 215, labelPos: 'right' },
  { id: 'readable-clear', title: 'Readable and clear', cluster: 'style', kind: 'skill', state: 'locked', icon: '🔒', x: 870, y: 280, labelPos: 'right' },

  // --- Under the Hood (right-bottom): labels RIGHT ---
  { id: 'read-console', title: 'Read the console', cluster: 'hood', kind: 'skill', state: 'available', icon: '🐞', x: 870, y: 460, labelPos: 'right' },
  { id: 'find-code', title: 'Find it in the code', cluster: 'hood', kind: 'skill', state: 'available', icon: '🐞', x: 870, y: 525, labelPos: 'right' },
  { id: 'undo-cause', title: 'Undo to find the cause', cluster: 'hood', kind: 'skill', state: 'locked', icon: '🔒', x: 870, y: 590, labelPos: 'right' },
]

// Edges: { from, to, locked? }
export const EDGES = [
  { from: 'use-lingo', to: 'intro' },
  { from: 'intro', to: 'steer-it' },
  { from: 'steer-it', to: 'keep-redirect' },
  { from: 'intro', to: 'give-context' },
  { from: 'give-context', to: 'check-fix' },
  { from: 'check-fix', to: 'show-off', locked: true },

  { from: 'list-pick', to: 'use-lingo' },
  { from: 'number-rule', to: 'use-lingo' },
  { from: 'remember-show', to: 'use-lingo' },

  { from: 'say-voice', to: 'give-context' },
  { from: 'load-point', to: 'give-context' },
  { from: 'ask-clear', to: 'give-context' },

  { from: 'keep-redirect', to: 'layout-spacing' },
  { from: 'keep-redirect', to: 'style-consistency' },
  { from: 'style-consistency', to: 'readable-clear', locked: true },

  { from: 'give-context', to: 'read-console' },
  { from: 'check-fix', to: 'find-code' },
  { from: 'find-code', to: 'undo-cause', locked: true },
]

export function getNode(id) {
  return NODES.find((n) => n.id === id) || null
}

// --- Per-node detail for the side panel (mocked copy for the demo). ---
export const NODE_META = {
  'list-pick': { skill: 'Interactive', mins: 10, blurb: 'Build a list the page can choose from, then show a random pick on demand.' },
  'number-rule': { skill: 'Interactive', mins: 10, blurb: 'Store a number and react to it with a simple rule — the start of logic.' },
  'remember-show': { skill: 'Interactive', mins: 10, blurb: 'Keep a value as the user interacts, then show it back to them.' },
  'say-voice': { skill: 'Story', mins: 10, blurb: 'Write copy that sounds like you, not like a template.' },
  'load-point': { skill: 'Story', mins: 10, blurb: 'Lead with the point so a visitor gets it in the first line.' },
  'ask-clear': { skill: 'Story', mins: 10, blurb: 'Make the call-to-action obvious and easy to act on.' },
  'use-lingo': { skill: 'Language', mins: 10, blurb: 'Name the parts of a page — hero, nav, cards — so you can describe what you want.' },
  'intro': { skill: 'Onboarding', mins: 5, blurb: 'A quick diagnostic that shapes your path from here.' },
  'steer-it': { skill: 'Build', mins: 10, blurb: 'Write a prompt that steers the AI toward your intent, then refine it.' },
  'keep-redirect': { skill: 'Build', mins: 10, blurb: 'Judge the output against your intent and decide: keep, redirect, or override.' },
  'give-context': { skill: 'Debug', mins: 10, blurb: 'Describe a problem with enough context that the AI can actually help.' },
  'check-fix': { skill: 'Debug', mins: 10, blurb: 'Verify a proposed fix: is the problem gone, and did nothing new break?' },
  'show-off': { skill: 'Capstone', mins: 15, blurb: 'Polish and publish your project. Unlocks once the core path is done.' },
  'layout-spacing': { skill: 'Style', mins: 10, blurb: 'Use spacing and alignment so the page reads cleanly.' },
  'style-consistency': { skill: 'Style', mins: 10, blurb: 'Keep color, type and spacing consistent across the page.' },
  'readable-clear': { skill: 'Style', mins: 10, blurb: 'Make text readable: contrast, size, and line length.' },
  'read-console': { skill: 'Debug', mins: 10, blurb: 'Open the console and read what the browser is telling you.' },
  'find-code': { skill: 'Debug', mins: 10, blurb: 'Trace an error back to the line or element at fault.' },
  'undo-cause': { skill: 'Debug', mins: 10, blurb: 'Undo changes to isolate what caused a regression.' },
}

export const STATE_META = {
  completed: { label: 'Mastered', order: 0 },
  current: { label: 'In progress', order: 1 },
  available: { label: 'Ready to start', order: 2 },
  locked: { label: 'Locked', order: 3 },
}

export function treeProgress() {
  const total = NODES.length
  const done = NODES.filter((n) => n.state === 'completed').length
  const inProgress = NODES.filter((n) => n.state === 'current').length
  const available = NODES.filter((n) => n.state === 'available').length
  const locked = NODES.filter((n) => n.state === 'locked').length
  return { total, done, inProgress, available, locked, pct: total ? Math.round((100 * done) / total) : 0 }
}

// Neighbours of a node (ids on either end of a shared edge), for hover highlight.
export function neighborsOf(id) {
  const ids = new Set()
  for (const e of EDGES) {
    if (e.from === id) ids.add(e.to)
    if (e.to === id) ids.add(e.from)
  }
  return ids
}

export function edgesTouching(id) {
  return EDGES.filter((e) => e.from === id || e.to === id)
}

// ---------------------------------------------------------------------------
// Assignment-driven tree (diagnostic: teacher picks CSTA standards -> skills).
// When a teacher has assigned standards to the student, the skill tree is built
// from those instead of the default demo graph. One cluster per subarea
// (Artificial Intelligence, Cybersecurity); each assigned standard is a node,
// laid out in columns inside its cluster. Returns the same { CLUSTERS, NODES,
// EDGES } shape the component already renders.
// ---------------------------------------------------------------------------
export function buildAssignedTree(standards) {
  const byArea = {}
  for (const s of standards) {
    ;(byArea[s.areaId] = byArea[s.areaId] || { id: s.areaId, label: s.areaLabel, items: [] }).items.push(s)
  }
  const areas = Object.values(byArea)
  const COL_W = 520
  const ROW_H = 64
  const TOP = 110
  const clusters = []
  const nodes = []
  const edges = []
  const icon = (areaId) => (areaId === 'cyb' ? '🔐' : '🤖')

  areas.forEach((area, ai) => {
    const colX = 70 + ai * COL_W
    const rows = area.items.length
    const boxH = Math.max(ROW_H * rows + 40, 120)
    clusters.push({ id: area.id, label: area.label, box: { x: colX - 30, y: 70, w: 360, h: boxH } })
    area.items.forEach((s, i) => {
      const id = s.code
      const y = TOP + i * ROW_H
      nodes.push({
        id,
        title: `${s.code} — ${s.statement}`,
        shortTitle: s.code,
        cluster: area.id,
        kind: 'skill',
        state: i === 0 ? 'available' : 'locked',
        icon: icon(area.id),
        x: colX,
        y,
        labelPos: 'right',
      })
      if (i > 0) edges.push({ from: area.items[i - 1].code, to: id })
    })
  })

  const widest = areas.reduce((m, a) => Math.max(m, a.items.length), 0)
  const canvas = { w: 70 + areas.length * COL_W + 360, h: Math.max(TOP + widest * ROW_H + 60, 400) }
  return { CLUSTERS: clusters, NODES: nodes, EDGES: edges, CANVAS: canvas }
}
