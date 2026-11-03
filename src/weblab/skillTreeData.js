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
