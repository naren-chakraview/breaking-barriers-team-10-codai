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
  // A branching learning-path tree. Each CSTA area (AI, Cybersecurity) is a
  // vertical trunk; within an area, standards are grouped by sub-concept (the
  // 3-letter code, e.g. DD, HR, CYB:TS) into branches, and ordered intro (S1)
  // before advanced (S2) so difficulty flows top-to-bottom. The first node of
  // the first branch is available; everything downstream is locked until reached.
  const SUB_LABEL = {
    DD: 'Design & Develop', DS: 'Data', HR: 'Human & Responsible', PP: 'Practices & Impact',
    CP: 'Policy', ND: 'Network Design', NO: 'Network Ops', TS: 'Threats & Safeguards',
  }
  const parse = (code) => {
    const m = /^S(\d)-(AIN|CYB)-([A-Z]+)-(\d+)$/.exec(code)
    return m ? { spec: Number(m[1]), area: m[2], sub: m[3], num: Number(m[4]) } : { spec: 1, area: 'AIN', sub: 'XX', num: 0 }
  }

  // Group by area, then by sub-concept.
  const areasMap = {}
  for (const s of standards) {
    const info = parse(s.code)
    const a = (areasMap[s.areaId] = areasMap[s.areaId] || { id: s.areaId, label: s.areaLabel, subs: {}, area: info.area })
    const sub = (a.subs[info.sub] = a.subs[info.sub] || { key: info.sub, label: SUB_LABEL[info.sub] || info.sub, items: [] })
    sub.items.push({ ...s, ...info })
  }
  const areas = Object.values(areasMap)

  // Layout constants.
  const AREA_W = 560       // horizontal space per area
  const TRUNK_X = 130      // trunk offset within an area
  const BRANCH_DX = 150    // how far a branch node sits right of the trunk
  const ROW_H = 72         // vertical spacing between items
  const TOP = 150
  const ROOT_Y = 92

  const clusters = []
  const nodes = []
  const edges = []
  const areaIcon = (areaId) => (areaId === 'cyb' ? '🛡️' : '🧠')

  let firstAvailableSet = false

  areas.forEach((area, ai) => {
    const ox = 60 + ai * AREA_W
    const trunkX = ox + TRUNK_X
    const subs = Object.values(area.subs)
    // order sub-concepts by their earliest spec then key, for a stable layout
    subs.sort((a, b) => (Math.min(...a.items.map((i) => i.spec)) - Math.min(...b.items.map((i) => i.spec))) || a.key.localeCompare(b.key))

    // Area root node (the trunk head) — a milestone showing the area.
    const rootId = `area-${area.id}`
    nodes.push({
      id: rootId, title: area.label, shortTitle: area.label, cluster: area.id,
      kind: 'milestone', state: 'available', icon: areaIcon(area.id), x: trunkX, y: ROOT_Y,
      big: true, labelPos: 'below', isRoot: true,
    })

    let row = 0
    let prevTrunkId = rootId
    subs.forEach((sub) => {
      // Branch anchor on the trunk for this sub-concept.
      const anchorY = TOP + row * ROW_H
      const anchorId = `anchor-${area.id}-${sub.key}`
      nodes.push({
        id: anchorId, title: sub.label, shortTitle: sub.label, cluster: area.id,
        kind: 'branch', state: 'milestone', icon: '', x: trunkX, y: anchorY,
        labelPos: 'left', isAnchor: true, subLabel: sub.label,
      })
      edges.push({ from: prevTrunkId, to: anchorId, trunk: true })
      prevTrunkId = anchorId

      // Items of this sub-concept fan out to the right, intro first.
      sub.items.sort((a, b) => (a.spec - b.spec) || (a.num - b.num))
      sub.items.forEach((it, j) => {
        const id = it.code
        const y = anchorY + j * ROW_H
        const state = !firstAvailableSet ? 'available' : 'locked'
        if (!firstAvailableSet) firstAvailableSet = true
        nodes.push({
          id,
          title: `${it.code} — ${it.statement}`,
          shortTitle: it.code,
          tierBadge: it.spec === 1 ? 'Intro' : 'Advanced',
          spec: it.spec,
          cluster: area.id,
          kind: 'skill',
          state,
          icon: areaIcon(area.id),
          x: trunkX + BRANCH_DX,
          y,
          labelPos: 'right',
        })
        edges.push({ from: j === 0 ? anchorId : sub.items[j - 1].code, to: id })
      })
      row += Math.max(1, sub.items.length)
    })

    const areaH = TOP + row * ROW_H
    clusters.push({ id: area.id, label: `${area.label}`, box: { x: ox + 20, y: 60, w: AREA_W - 70, h: Math.max(areaH - 20, 160) } })
  })

  const maxRows = areas.reduce((m, a) => {
    const r = Object.values(a.subs).reduce((n, sub) => n + Math.max(1, sub.items.length), 0)
    return Math.max(m, r)
  }, 0)
  const canvas = { w: 60 + areas.length * AREA_W + 60, h: Math.max(TOP + maxRows * ROW_H + 80, 460) }
  return { CLUSTERS: clusters, NODES: nodes, EDGES: edges, CANVAS: canvas }
}
