// Mock class data for the teacher view (see teacher-view-design.md). No backend:
// everything the roster and student detail show lives here and in component
// state. Student content mirrors the wireframe (Alex Kim is the worked example).

export const SKILLS = [
  'HTML structure', 'Headings', 'Lists & nav', 'CSS styling', 'Responsive', 'Deploy & share',
]

// Standards labels are taken from the wireframe. Verify against the official
// CSTA text before using for real grading.
export const STANDARDS = [
  { code: 'CSTA 1B-AP-10', label: 'Create programs w/ sequence' },
  { code: 'CSTA 1B-AP-11', label: 'Decompose into sub-problems' },
  { code: 'CSTA 1B-AP-15', label: 'Test & debug' },
  { code: 'CSTA 1B-AP-17', label: 'Describe & fix errors' },
]

export const RATINGS = {
  proficient: { label: 'Proficient', points: 100 },
  developing: { label: 'Developing', points: 80 },
  support: { label: 'Needs support', points: 50 },
}

export const STATUS = {
  'on-track': { label: 'on track', tone: 'good' },
  ahead: { label: 'ahead', tone: 'good' },
  stuck: { label: 'stuck', tone: 'warn' },
  behind: { label: 'behind', tone: 'bad' },
}

// The scaffolded help ladder (Requirement 10), in order.
export const HELP_STEPS = [
  { key: 'inline', title: 'Inline hint on wrong run' },
  { key: 'frontend', title: 'Point to the visual front-end' },
  { key: 'extra', title: 'Additional hint' },
  { key: 'reveal', title: 'Timed reveal' },
  { key: 'iterate', title: 'Next module: iteration' },
]

export function overallScore(ratings) {
  if (!ratings.length) return 0
  const total = ratings.reduce((sum, r) => sum + RATINGS[r].points, 0)
  return Math.round(total / ratings.length)
}

export function letterFor(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

// Skills for a student: everything below their level is mastered, the next one
// is in progress, the rest are locked.
export function skillStates(level) {
  const mastered = Math.min(level - 1, SKILLS.length)
  return SKILLS.map((name, i) => ({
    name,
    state: i < mastered ? 'mastered' : i === mastered ? 'progress' : 'locked',
  }))
}

export function formatClock(seconds) {
  const s = Math.max(0, seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const help = (stage, messages, extra = {}) => ({
  stage, messages, remaining: 0, timeoutMin: 5, seeAnswer: true, reason: null, sentHints: [], ...extra,
})

export const INITIAL_STUDENTS = [
  {
    id: 'alex', name: 'Alex Kim', initials: 'AK', level: 4, levelLabel: 'Level 4 of 7 · styling',
    mastery: 61, status: 'stuck', hintsUsed: 2, minutes: 31, gradeOverride: null,
    ratings: ['proficient', 'proficient', 'developing', 'support'],
    code: {
      lines: [
        { text: '<body>' },
        { text: '  <h1>Hi, I\'m Alex</h1>' },
        { text: '  <style>' },
        { text: '    h1 { color blue; }', flag: '⚠ missing colon' },
        { text: '  </style>' },
        { text: '</body>' },
      ],
      run: { ok: false, lines: ['CSS not applied — heading still black', 'tutor flagged this · student stuck 6 min'] },
    },
    help: help(3, [
      'Your CSS rule is missing a colon after \'color\'.',
      'Check the live preview — the heading is still black.',
      'Compare your syntax to the example above it.',
    ], { remaining: 120 }),
  },
  {
    id: 'jordan', name: 'Jordan Miller', initials: 'JM', level: 6, levelLabel: 'Level 6 · responsive',
    mastery: 86, status: 'on-track', hintsUsed: 1, minutes: 38, gradeOverride: null,
    ratings: ['proficient', 'proficient', 'proficient', 'developing'],
    code: {
      lines: [
        { text: '<meta name="viewport" content="width=device-width">' },
        { text: '<style>' },
        { text: '  @media (max-width: 600px) {' },
        { text: '    body { padding: 12px; }' },
        { text: '  }' },
        { text: '</style>' },
      ],
      run: { ok: true, lines: ['Build passed · preview matches the goal', 'no help needed'] },
    },
    help: help(0, []),
  },
  {
    id: 'priya', name: 'Priya Shah', initials: 'PS', level: 7, levelLabel: 'Level 7 · deploying',
    mastery: 97, status: 'ahead', hintsUsed: 0, minutes: 42, gradeOverride: null,
    ratings: ['proficient', 'proficient', 'proficient', 'proficient'],
    code: {
      lines: [
        { text: '<h1>Priya\'s Portfolio</h1>' },
        { text: '<nav>' },
        { text: '  <a href="#about">About</a>' },
        { text: '</nav>' },
      ],
      run: { ok: true, lines: ['Build passed · deployed to sandbox', 'on to the stretch challenge'] },
    },
    help: help(0, []),
  },
  {
    id: 'diego', name: 'Diego Ortiz', initials: 'DO', level: 2, levelLabel: 'Level 2 · HTML basics',
    mastery: 29, status: 'behind', hintsUsed: 3, minutes: 27, gradeOverride: null,
    ratings: ['developing', 'support', 'support', 'support'],
    code: {
      lines: [
        { text: '<h1>My site', flag: '⚠ <h1> never closed' },
        { text: '<p>I like music</p>' },
      ],
      run: { ok: false, lines: ['Preview shows everything as a heading', 'tutor flagged this · student stuck 9 min'] },
    },
    help: help(1, ['Every tag needs a closing tag — your <h1> is missing </h1>.']),
  },
  {
    id: 'mia', name: 'Mia Nguyen', initials: 'MN', level: 5, levelLabel: 'Level 5 · styling',
    mastery: 71, status: 'on-track', hintsUsed: 1, minutes: 35, gradeOverride: null,
    ratings: ['proficient', 'proficient', 'developing', 'developing'],
    code: {
      lines: [
        { text: 'body { background: #f0f9ff; }' },
        { text: 'h1 { color: navy; }' },
        { text: 'p { border-left: 4px solid #4f46e5; }' },
      ],
      run: { ok: true, lines: ['Build passed · colors applied', 'no help needed'] },
    },
    help: help(0, []),
  },
  {
    id: 'liam', name: 'Liam Wong', initials: 'LW', level: 3, levelLabel: 'Level 3 · lists / nav',
    mastery: 43, status: 'stuck', hintsUsed: 2, minutes: 29, gradeOverride: null,
    ratings: ['proficient', 'developing', 'support', 'support'],
    code: {
      lines: [
        { text: '<ul>' },
        { text: '  <li>Home</li>' },
        { text: '  <li>About</li>', flag: '⚠ missing </ul>' },
        { text: '<p>Welcome!</p>' },
      ],
      run: { ok: false, lines: ['List swallows the rest of the page', 'tutor flagged this · student stuck 4 min'] },
    },
    help: help(2, [
      'Your <ul> list is missing its closing tag.',
      'Look at the live preview — the paragraph is inside the list.',
    ]),
  },
]
