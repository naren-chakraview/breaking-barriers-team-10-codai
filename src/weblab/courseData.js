// Mock content for the "Hour of AI 2026 - Adaptive Weblab" lesson.
// This is the human-authored curriculum the (simulated) adaptive engine
// routes a student through. No backend — everything lives in the browser.

// A lesson is made up of ordered levels. Each level targets one objective,
// carries instructions + starter code, and defines a lightweight rubric used
// by the mock validation service to produce a mastery signal.

export const LESSON = {
  lessonId: 'hour-of-ai-2026-weblab',
  title: 'Hour of AI 2026 — Adaptive Web Lab',
  unitTitle: 'Unit 1 · Hour of AI 2026 — Adaptive Web Lab',
  estimatedMinutes: 45,
  // The learning objectives tracked in the checklist / outcomes panel.
  objectives: [
    { id: 'obj-structure', code: 'HTML.1', title: 'Structure a page with HTML' },
    { id: 'obj-style', code: 'CSS.1', title: 'Style a page with CSS' },
    { id: 'obj-layout', code: 'CSS.2', title: 'Lay out content so it reads well' },
    { id: 'obj-polish', code: 'WEB.1', title: 'Polish and make it your own' },
  ],
}

// Difficulty tiers let the router send a struggling student to a "support"
// level and an advanced student to a "stretch" level for the SAME objective,
// keeping everyone on the same objectives (per the vision doc).
export const LEVELS = [
  // --- Objective: structure (core) ---
  {
    id: 'lvl-structure-core',
    objectiveId: 'obj-structure',
    tier: 'core',
    title: 'Add a heading and a paragraph',
    instructions:
      'Every webpage starts with its content. In the HTML, add an <h1> heading with your name and a <p> paragraph that says one thing you like. Then press Run to see it in the preview.',
    starter: {
      html: '<!-- Add an <h1> and a <p> below -->\n',
      css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n',
    },
    // The mock validator checks that these appear in the student's HTML.
    rubric: { html: ['<h1', '</h1>', '<p', '</p>'] },
    hint: {
      summary: 'Not sure how to add a heading?',
      steps: [
        'An HTML tag has an opening and closing part, like <h1>...</h1>.',
        'Put your name between them: <h1>Alex</h1>.',
        'Add a paragraph the same way with <p> tags: <p>I like soccer.</p>.',
      ],
    },
  },
  {
    id: 'lvl-structure-support',
    objectiveId: 'obj-structure',
    tier: 'support',
    title: 'Fill in the blanks: heading and paragraph',
    instructions:
      "Let's take it one step at a time. The skeleton is started for you — replace the TODO text inside the tags with your own words, then press Run.",
    starter: {
      html: '<h1>TODO: your name</h1>\n<p>TODO: one thing you like</p>\n',
      css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n',
    },
    rubric: { html: ['<h1', '</h1>', '<p', '</p>'] },
    hint: {
      summary: 'Where do I type?',
      steps: [
        'Find the text that says TODO inside the <h1> tags.',
        'Delete "TODO: your name" and type your own name in its place.',
        'Do the same for the <p> paragraph, then press Run.',
      ],
    },
  },
  // --- Objective: style (core) ---
  {
    id: 'lvl-style-core',
    objectiveId: 'obj-style',
    tier: 'core',
    title: 'Give your page some color',
    instructions:
      'Now make it yours. In the CSS, set a background color on the body and a text color on your <h1>. Try color names like "navy" or hex codes like #4f46e5.',
    starter: null, // keep the student's prior code (carried forward)
    rubric: { css: ['background', 'color'] },
    hint: {
      summary: 'How do I change colors?',
      steps: [
        'CSS rules look like: selector { property: value; }.',
        'Set the page background: body { background: #f0f9ff; }.',
        'Color your heading text: h1 { color: navy; }.',
      ],
    },
  },
  {
    id: 'lvl-style-stretch',
    objectiveId: 'obj-style',
    tier: 'stretch',
    title: 'Color with intention',
    instructions:
      "You've got the basics — go deeper. Choose a background and text color that have good contrast so the page is easy to read, and add a splash of accent color to one element.",
    starter: null,
    rubric: { css: ['background', 'color'] },
    hint: {
      summary: 'What makes colors readable?',
      steps: [
        'High contrast means dark text on a light background (or vice versa).',
        'Pick a light body background and a dark h1 color.',
        'Add one accent, e.g. a colored border on the paragraph.',
      ],
    },
  },
  // --- Objective: layout (core) ---
  {
    id: 'lvl-layout-core',
    objectiveId: 'obj-layout',
    tier: 'core',
    title: 'Make it readable',
    instructions:
      'Good pages are easy to read. In the CSS, center your content and add some spacing. Try setting a max-width on the body and margin auto to center it.',
    starter: null,
    rubric: { css: ['max-width', 'margin'] },
    hint: {
      summary: 'How do I center things?',
      steps: [
        'Give the body a max-width so lines are not too long: max-width: 600px;.',
        'Center it horizontally with: margin: 0 auto;.',
        'Add breathing room with padding, e.g. padding: 32px;.',
      ],
    },
  },
  // --- Objective: polish (core) ---
  {
    id: 'lvl-polish-core',
    objectiveId: 'obj-polish',
    tier: 'core',
    title: 'Add your own touch',
    instructions:
      'Finish strong. Add one more element that makes the page yours — a list of hobbies, a favorite quote in a <blockquote>, or a second paragraph. Style it however you like, then Run.',
    starter: null,
    rubric: { html: ['<ul', '<li'], anyOf: true },
    hint: {
      summary: 'Ideas for a finishing touch',
      steps: [
        'A bulleted list: <ul><li>Reading</li><li>Soccer</li></ul>.',
        'A quote: <blockquote>Stay curious.</blockquote>.',
        'Style your new element with a CSS rule to match the page.',
      ],
    },
  },
]

export function getLevel(levelId) {
  return LEVELS.find((l) => l.id === levelId) || null
}

export function getObjective(objectiveId) {
  return LESSON.objectives.find((o) => o.id === objectiveId) || null
}

// The default starting level when a student opens the lesson.
export const FIRST_LEVEL_ID = 'lvl-structure-core'
