// Mock content for the "Hour of AI 2026 - Adaptive Weblab" lesson.
// No backend — everything lives in the browser.
//
// Each level has:
//  - targets: the default "Show me where" code/web target (step 1's spot)
//  - hint.steps: scaffolded hint text, revealed one at a time
//  - hint.stepTargets: one target per step, so the inline arrow + comment
//    update as the student reveals each step. Each entry is { code?, web? }
//    where code = { file, match?, line?, comment } and
//    web = { selector, comment }. comment = { title, body, code? }.

export const LESSON = {
  lessonId: 'hour-of-ai-2026-weblab',
  title: 'Hour of AI 2026 — Adaptive Web Lab',
  unitTitle: 'Unit 1 · Hour of AI 2026 — Adaptive Web Lab',
  estimatedMinutes: 45,
  objectives: [
    { id: 'obj-structure', code: 'HTML.1', title: 'Structure a page with HTML' },
    { id: 'obj-style', code: 'CSS.1', title: 'Style a page with CSS' },
    { id: 'obj-layout', code: 'CSS.2', title: 'Lay out content so it reads well' },
    { id: 'obj-polish', code: 'WEB.1', title: 'Polish and make it your own' },
  ],
}

export const LEVELS = [
  // --- structure (core) ---
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
    rubric: { html: ['<h1', '</h1>', '<p', '</p>'] },
    targets: {
      code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Add your heading here', body: 'An <h1> is the biggest title on the page. Type an opening and closing tag with your name in the middle.', code: '<h1>Your Name</h1>' } },
      web: { selector: 'body', comment: { title: 'Your live webpage', body: 'Press Run and the heading and paragraph you wrote appear here instantly.' } },
    },
    hint: {
      summary: 'Not sure how to add a heading?',
      steps: [
        'An HTML tag has an opening and closing part, like <h1>...</h1>.',
        'Put your name between them: <h1>Alex</h1>.',
        'Add a paragraph the same way with <p> tags: <p>I like soccer.</p>.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Step 1 — write a tag', body: 'Tags come in pairs: an opening <h1> and a closing </h1>. Type them on this line.', code: '<h1></h1>' } } },
        { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Step 2 — add your name', body: 'Put your name between the opening and closing tags.', code: '<h1>Alex</h1>' } } },
        { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Step 3 — add a paragraph', body: 'On the next line, add a <p> the same way for a sentence.', code: '<p>I like soccer.</p>' } }, web: { selector: 'body', comment: { title: 'Press Run', body: 'Run to see your heading and paragraph appear.' } } },
      ],
    },
  },
  // --- structure (support) ---
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
    targets: {
      code: { file: 'index.html', match: 'TODO: your name', line: 1, comment: { title: 'Replace the TODO', body: 'Type your own name over "TODO: your name". Keep the tags around it.', code: '<h1>Alex</h1>' } },
      web: { selector: 'h1', comment: { title: 'Your heading', body: 'After you edit and Run, your name shows here.' } },
    },
    hint: {
      summary: 'Where do I type?',
      steps: [
        'Find the text that says TODO inside the <h1> tags.',
        'Delete "TODO: your name" and type your own name in its place.',
        'Do the same for the <p> paragraph, then press Run.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: 'TODO: your name', line: 1, comment: { title: 'Step 1 — find the TODO', body: 'Look at line 1 — the words "TODO: your name" sit inside the <h1> tags.' } } },
        { code: { file: 'index.html', match: 'TODO: your name', line: 1, comment: { title: 'Step 2 — type your name', body: 'Select those words and type your own name. Keep <h1> and </h1>.', code: '<h1>Alex</h1>' } } },
        { code: { file: 'index.html', match: 'TODO: one thing', line: 2, comment: { title: 'Step 3 — now the paragraph', body: 'Do the same on line 2 for the <p>, then press Run.', code: '<p>I like soccer.</p>' } }, web: { selector: 'h1', comment: { title: 'Your heading', body: 'Run to see it update here.' } } },
      ],
    },
  },
  // --- style (core) ---
  {
    id: 'lvl-style-core',
    objectiveId: 'obj-style',
    tier: 'core',
    title: 'Give your page some color',
    instructions:
      'Now make it yours. In the CSS, set a background color on the body and a text color on your <h1>. Try color names like "navy" or hex codes like #4f46e5.',
    starter: null,
    rubric: { css: ['background', 'color'] },
    targets: {
      code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Color the page', body: 'Add a background line inside the body rule. Lines end with a semicolon.', code: 'background: #f0f9ff;' } },
      web: { selector: 'h1', comment: { title: 'Color your heading', body: 'A new h1 rule changes the heading color.', code: 'h1 { color: navy; }' } },
    },
    hint: {
      summary: 'How do I change colors?',
      steps: [
        'CSS rules look like: selector { property: value; }.',
        'Set the page background: body { background: #f0f9ff; }.',
        'Color your heading text: h1 { color: navy; }.',
      ],
      stepTargets: [
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 1 — how CSS looks', body: 'A rule is selector { property: value; }. The body rule is already here.' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 2 — page background', body: 'Add a background line inside the body braces.', code: 'background: #f0f9ff;' } } },
        { code: { file: 'styles.css', match: 'font-family', line: 2, comment: { title: 'Step 3 — heading color', body: 'Add a new rule for the h1 below the body rule.', code: 'h1 { color: navy; }' } }, web: { selector: 'h1', comment: { title: 'Heading color', body: 'Run to see the new color here.' } } },
      ],
    },
  },
  // --- style (stretch) ---
  {
    id: 'lvl-style-stretch',
    objectiveId: 'obj-style',
    tier: 'stretch',
    title: 'Color with intention',
    instructions:
      "You've got the basics — go deeper. Choose a background and text color that have good contrast so the page is easy to read, and add a splash of accent color to one element.",
    starter: null,
    rubric: { css: ['background', 'color'] },
    targets: {
      code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Pick readable colors', body: 'Set a background and text color with good contrast.', code: 'background: #ffffff;\ncolor: #1f2937;' } },
      web: { selector: 'p', comment: { title: 'Add an accent', body: 'Give the paragraph a colored border for a splash of color.', code: 'p { border-left: 4px solid #4f46e5; }' } },
    },
    hint: {
      summary: 'What makes colors readable?',
      steps: [
        'High contrast means dark text on a light background (or vice versa).',
        'Pick a light body background and a dark h1 color.',
        'Add one accent, e.g. a colored border on the paragraph.',
      ],
      stepTargets: [
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 1 — contrast', body: 'Readable means dark text on a light background (or the reverse).' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 2 — set them', body: 'Add a light background and a dark text color in the body rule.', code: 'background: #ffffff;\ncolor: #1f2937;' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3 — one accent', body: 'Add a colored border to the paragraph.', code: 'p { border-left: 4px solid #4f46e5; }' } }, web: { selector: 'p', comment: { title: 'The accent', body: 'Run to see the accent on your paragraph.' } } },
      ],
    },
  },
  // --- layout (core) ---
  {
    id: 'lvl-layout-core',
    objectiveId: 'obj-layout',
    tier: 'core',
    title: 'Make it readable',
    instructions:
      'Good pages are easy to read. In the CSS, center your content and add some spacing. Try setting a max-width on the body and margin auto to center it.',
    starter: null,
    rubric: { css: ['max-width', 'margin'] },
    targets: {
      code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Center your content', body: 'Add max-width and margin: 0 auto inside the body rule.', code: 'max-width: 600px;\nmargin: 0 auto;' } },
      web: { selector: 'body', comment: { title: 'Watch it center', body: 'After you add the rules, Run and it becomes a centered column.' } },
    },
    hint: {
      summary: 'How do I center things?',
      steps: [
        'Give the body a max-width so lines are not too long: max-width: 600px;.',
        'Center it horizontally with: margin: 0 auto;.',
        'Add breathing room with padding, e.g. padding: 32px;.',
      ],
      stepTargets: [
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 1 — cap the width', body: 'Add a max-width so text lines are not too wide.', code: 'max-width: 600px;' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 2 — center it', body: 'margin: 0 auto puts equal space on each side.', code: 'margin: 0 auto;' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3 — breathing room', body: 'Add padding so content is not cramped.', code: 'padding: 32px;' } }, web: { selector: 'body', comment: { title: 'Centered', body: 'Run to see your centered column.' } } },
      ],
    },
  },
  // --- polish (core) ---
  {
    id: 'lvl-polish-core',
    objectiveId: 'obj-polish',
    tier: 'core',
    title: 'Add your own touch',
    instructions:
      'Finish strong. Add one more element that makes the page yours — a list of hobbies, a favorite quote in a <blockquote>, or a second paragraph. Style it however you like, then Run.',
    starter: null,
    rubric: { html: ['<ul', '<li'], anyOf: true },
    targets: {
      code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Add your own element', body: 'Make a new line and add a list or quote of your own.', code: '<ul>\n  <li>Reading</li>\n  <li>Soccer</li>\n</ul>' } },
      web: { selector: 'body', comment: { title: 'See your page grow', body: 'Your new element renders here after Run.' } },
    },
    hint: {
      summary: 'Ideas for a finishing touch',
      steps: [
        'A bulleted list: <ul><li>Reading</li><li>Soccer</li></ul>.',
        'A quote: <blockquote>Stay curious.</blockquote>.',
        'Style your new element with a CSS rule to match the page.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 1 — a list', body: 'Below your paragraph, add a bulleted list.', code: '<ul>\n  <li>Reading</li>\n  <li>Soccer</li>\n</ul>' } } },
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 2 — or a quote', body: 'Prefer a quote? Use a <blockquote> instead.', code: '<blockquote>Stay curious.</blockquote>' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3 — style it', body: 'Add a CSS rule so your new element matches the page.', code: 'ul { color: #4f46e5; }' } }, web: { selector: 'body', comment: { title: 'Your finished page', body: 'Run to see your new element in place.' } } },
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

export const FIRST_LEVEL_ID = 'lvl-structure-core'
