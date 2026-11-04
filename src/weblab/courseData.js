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
  // Per objective: `canDo` is the student-facing goal ("I can ..."), `minutes` is
  // a rough pace (they add up to estimatedMinutes), and `terms` are the key
  // words, defined in plain language. "You've got it when..." is derived from
  // each objective's rubric, so it always matches what the checker looks for.
  objectives: [
    {
      id: 'obj-structure', code: 'HTML.1', title: 'Structure a page with HTML', minutes: 10,
      canDo: 'build a page with a heading and a paragraph using HTML tags.',
      terms: [
        { term: 'tag', meaning: 'A label in angle brackets, like <h1>, that tells the browser what something is.' },
        { term: 'heading', meaning: 'The big title of a page, written with <h1>.' },
        { term: 'paragraph', meaning: 'A block of text, written with <p>.' },
        { term: 'closing tag', meaning: 'The matching tag with a slash, like </h1>, that ends the element.' },
      ],
    },
    {
      id: 'obj-style', code: 'CSS.1', title: 'Style a page with CSS', minutes: 10,
      canDo: 'change the colors on my page with CSS rules.',
      terms: [
        { term: 'CSS rule', meaning: 'A style instruction: a selector, then settings inside { } curly braces.' },
        { term: 'selector', meaning: 'Says what to style, like body or h1.' },
        { term: 'property', meaning: 'What to change, like color or background.' },
        { term: 'value', meaning: 'The new setting, like navy or #f0f9ff.' },
      ],
    },
    {
      id: 'obj-layout', code: 'CSS.2', title: 'Lay out content so it reads well', minutes: 10,
      canDo: 'center my content and keep lines short enough to read comfortably.',
      terms: [
        { term: 'max-width', meaning: 'The widest an element is allowed to be.' },
        { term: 'margin', meaning: 'Space outside an element. margin: 0 auto; centers it.' },
        { term: 'padding', meaning: 'Space inside an element, between its edge and its content.' },
        { term: 'column', meaning: 'A narrow strip of content, easier to read than full width.' },
      ],
    },
    {
      id: 'obj-polish', code: 'WEB.1', title: 'Polish and make it your own', minutes: 15,
      canDo: 'add my own element, like a list or a quote, and make it match my page.',
      terms: [
        { term: 'element', meaning: 'Any building block of a page, like a heading, list or quote.' },
        { term: 'list', meaning: 'A set of bullets made with <ul>.' },
        { term: 'list item', meaning: 'One bullet, written with <li> inside a list.' },
        { term: 'blockquote', meaning: 'A quote set apart from the text around it, written with <blockquote>.' },
      ],
    },
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
        'HTML is built from tags that come in pairs. A heading uses an opening <h1> and a closing </h1>. Type an empty pair first: <h1></h1>',
        'Now put your name between the tags so it shows as the title: <h1>Alex</h1>. Whatever goes between the tags appears on the page.',
        'On the next line, add a paragraph the same way — <p> opens it, </p> closes it: <p>I like soccer.</p>. Then press Run to see both appear.',
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
        'Look at line 1. The words “TODO: your name” sit between <h1> and </h1>. Only the words in the middle are placeholder — the tags stay.',
        'Select just “TODO: your name” and type your own name over it, so it reads like <h1>Alex</h1>. Keep both tags exactly as they are.',
        'Do the same on line 2 for the paragraph — replace the TODO with a sentence — then press Run to see your page.',
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
        'CSS styles your page. A rule looks like  selector { property: value; }  — the selector picks what to style, and each line inside the braces ends with a semicolon.',
        'The body rule is already here. Inside its braces, add a background color line:  background: #f0f9ff;  — this colors the whole page.',
        'Now add a brand-new rule below it to color your heading:  h1 { color: navy; }  Then press Run and watch the colors change.',
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
        'Readable pages use high contrast — dark text on a light background, or the reverse. Low contrast (e.g. grey on white) is hard to read.',
        'In the body rule, set a light background and a dark text color, for example  background: #ffffff;  and  color: #1f2937;',
        'Add one splash of accent color so the page feels designed — e.g. a colored left border on the paragraph:  p { border-left: 4px solid #4f46e5; padding-left: 8px; }',
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
        'Very wide lines of text are hard to read. In the body rule, cap the width:  max-width: 600px;  so each line stays a comfortable length.',
        'A max-width alone sits on the left. Center it by adding  margin: 0 auto;  — “auto” splits the leftover space evenly on both sides.',
        'Finally, add some breathing room so text isn’t cramped against the edges:  padding: 32px;  Then press Run to see it centered.',
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
        'Pick one element to add below your paragraph. A bulleted list uses <ul> with <li> items inside — one <li> per bullet:  <ul><li>Reading</li><li>Soccer</li></ul>',
        'Prefer a quote instead? Wrap a line in <blockquote>:  <blockquote>Stay curious.</blockquote>  Use whichever feels like “you”.',
        'Give your new element a little style so it matches the page — e.g.  ul { color: #4f46e5; }  — then press Run to see your finished page.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 1 — a list', body: 'Below your paragraph, add a bulleted list.', code: '<ul>\n  <li>Reading</li>\n  <li>Soccer</li>\n</ul>' } } },
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 2 — or a quote', body: 'Prefer a quote? Use a <blockquote> instead.', code: '<blockquote>Stay curious.</blockquote>' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3 — style it', body: 'Add a CSS rule so your new element matches the page.', code: 'ul { color: #4f46e5; }' } }, web: { selector: 'body', comment: { title: 'Your finished page', body: 'Run to see your new element in place.' } } },
      ],
    },
  },
  // --- structure (stretch) ---
  {
    id: 'lvl-structure-stretch',
    objectiveId: 'obj-structure',
    tier: 'stretch',
    title: 'Structure with sections',
    instructions:
      "You've got headings and paragraphs — go further. Group your content into a <header> with your <h1>, then a <section> with a sub-heading <h2> and a paragraph. Semantic tags make a page easier to read and style.",
    starter: null,
    rubric: { html: ['<h1', '<h2', '<p'] },
    targets: {
      code: { file: 'index.html', match: '<h1', line: 1, comment: { title: 'Wrap it in a header', body: 'Put your <h1> inside a <header>, then add a <section> below with an <h2> and a <p>.', code: '<header>\n  <h1>Alex</h1>\n</header>\n<section>\n  <h2>About me</h2>\n  <p>I like soccer.</p>\n</section>' } },
      web: { selector: 'body', comment: { title: 'Same look, better structure', body: 'Sections do not change the look yet, but they make styling and layout far easier next.' } },
    },
    hint: {
      summary: 'What are semantic sections?',
      steps: [
        'Semantic tags describe what a chunk of the page IS. A <header> holds the top of the page; a <section> groups related content. They behave like a <div> but read better.',
        'Wrap your existing <h1> in a <header>:  <header><h1>Alex</h1></header>',
        'Below it, add a <section> with its own sub-heading and paragraph:  <section><h2>About me</h2><p>I like soccer.</p></section>  Then press Run.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: '<h1', line: 1, comment: { title: 'Step 1 — the idea', body: 'A <header> groups the top of the page; a <section> groups related content.' } } },
        { code: { file: 'index.html', match: '<h1', line: 1, comment: { title: 'Step 2 — add a header', body: 'Wrap your heading in a <header>.', code: '<header>\n  <h1>Alex</h1>\n</header>' } } },
        { code: { file: 'index.html', match: '<p', line: 2, comment: { title: 'Step 3 — add a section', body: 'Group a sub-heading and paragraph in a <section>.', code: '<section>\n  <h2>About me</h2>\n  <p>I like soccer.</p>\n</section>' } }, web: { selector: 'body', comment: { title: 'Run it', body: 'Structure changes, look stays — that is the point.' } } },
      ],
    },
  },
  // --- style (support) ---
  {
    id: 'lvl-style-support',
    objectiveId: 'obj-style',
    tier: 'support',
    title: 'Fill in the blanks: colors',
    instructions:
      "Let's do colors one line at a time. The CSS has two TODO lines — replace each TODO with a color, then press Run.",
    starter: {
      html: '<h1>My page</h1>\n<p>Welcome!</p>\n',
      css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n  background: TODO; /* a page color, e.g. #f0f9ff */\n}\n\nh1 {\n  color: TODO; /* a heading color, e.g. navy */\n}\n',
    },
    rubric: { css: ['background', 'color'] },
    targets: {
      code: { file: 'styles.css', match: 'background: TODO', line: 4, comment: { title: 'Replace the first TODO', body: 'Type a page color over "TODO". Keep the semicolon.', code: 'background: #f0f9ff;' } },
      web: { selector: 'body', comment: { title: 'Your page color', body: 'After you edit and Run, the whole page changes color.' } },
    },
    hint: {
      summary: 'Where do the colors go?',
      steps: [
        'Line 4 reads  background: TODO;  — only the word TODO is a placeholder. Replace it with a color like  #f0f9ff  (keep the semicolon).',
        'The h1 rule has  color: TODO;  — replace that TODO with a heading color like  navy.',
        'Press Run and watch both colors appear. Color names (navy, teal) and hex codes (#4f46e5) both work.',
      ],
      stepTargets: [
        { code: { file: 'styles.css', match: 'background: TODO', line: 4, comment: { title: 'Step 1 — page color', body: 'Replace the first TODO with a page color.', code: 'background: #f0f9ff;' } } },
        { code: { file: 'styles.css', match: 'color: TODO', line: 8, comment: { title: 'Step 2 — heading color', body: 'Replace the second TODO with a heading color.', code: 'color: navy;' } } },
        { code: { file: 'styles.css', match: 'color: TODO', line: 8, comment: { title: 'Step 3 — Run it', body: 'Press Run to see both colors.', code: 'color: navy;' } }, web: { selector: 'h1', comment: { title: 'Heading color', body: 'Run to see it here.' } } },
      ],
    },
  },
  // --- layout (support) ---
  {
    id: 'lvl-layout-support',
    objectiveId: 'obj-layout',
    tier: 'support',
    title: 'Fill in the blanks: center it',
    instructions:
      "One line at a time. The body rule has two TODOs — a max-width and a margin. Replace each, then Run.",
    starter: {
      html: '<h1>My page</h1>\n<p>Welcome to my site. This line is long enough to show why a max-width helps readability.</p>\n',
      css: 'body {\n  font-family: system-ui, sans-serif;\n  max-width: TODO; /* e.g. 600px */\n  margin: TODO; /* e.g. 0 auto */\n  padding: 32px;\n}\n',
    },
    rubric: { css: ['max-width', 'margin'] },
    targets: {
      code: { file: 'styles.css', match: 'max-width: TODO', line: 3, comment: { title: 'Replace the first TODO', body: 'Set how wide the content can get.', code: 'max-width: 600px;' } },
      web: { selector: 'body', comment: { title: 'Watch it narrow', body: 'After you edit and Run, the column stops stretching full width.' } },
    },
    hint: {
      summary: 'Which line does what?',
      steps: [
        'Line 3 is  max-width: TODO;  — replace TODO with  600px.  This caps how wide the text gets.',
        'Line 4 is  margin: TODO;  — replace TODO with  0 auto.  The "auto" centers the block.',
        'Press Run. The content becomes a centered, comfortable column.',
      ],
      stepTargets: [
        { code: { file: 'styles.css', match: 'max-width: TODO', line: 3, comment: { title: 'Step 1 — the width', body: 'Replace the first TODO.', code: 'max-width: 600px;' } } },
        { code: { file: 'styles.css', match: 'margin: TODO', line: 4, comment: { title: 'Step 2 — center it', body: 'Replace the second TODO.', code: 'margin: 0 auto;' } } },
        { code: { file: 'styles.css', match: 'margin: TODO', line: 4, comment: { title: 'Step 3 — Run it', body: 'Press Run to see the centered column.' }, }, web: { selector: 'body', comment: { title: 'Centered', body: 'Run to see it.' } } },
      ],
    },
  },
  // --- layout (stretch) ---
  {
    id: 'lvl-layout-stretch',
    objectiveId: 'obj-layout',
    tier: 'stretch',
    title: 'Layout with rhythm',
    instructions:
      "You can center — now add vertical rhythm. Center the body with max-width and margin, then give your headings and paragraphs consistent spacing with margin so the page breathes.",
    starter: null,
    rubric: { css: ['max-width', 'margin'] },
    targets: {
      code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Center, then space', body: 'Center the body, then add margins to h1/h2/p for rhythm.', code: 'max-width: 640px;\nmargin: 0 auto;' } },
      web: { selector: 'body', comment: { title: 'Even spacing', body: 'Consistent margins make a page feel designed, not cramped.' } },
    },
    hint: {
      summary: 'What is vertical rhythm?',
      steps: [
        'First center as before:  max-width: 640px; margin: 0 auto;  in the body rule.',
        'Rhythm means consistent gaps between blocks. Add a bottom margin to paragraphs:  p { margin: 0 0 16px; }',
        'Give headings a little more room above them:  h2 { margin-top: 28px; }  Then Run and notice the even spacing.',
      ],
      stepTargets: [
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 1 — center', body: 'Center the body first.', code: 'max-width: 640px;\nmargin: 0 auto;' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 2 — paragraph rhythm', body: 'Add a consistent bottom margin to paragraphs.', code: 'p { margin: 0 0 16px; }' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3 — heading space', body: 'Give headings room above.', code: 'h2 { margin-top: 28px; }' } }, web: { selector: 'body', comment: { title: 'Rhythm', body: 'Run to see the even spacing.' } } },
      ],
    },
  },
  // --- polish (support) ---
  {
    id: 'lvl-polish-support',
    objectiveId: 'obj-polish',
    tier: 'support',
    title: 'Fill in the blanks: add a list',
    instructions:
      "Add one element with the skeleton provided. Replace the TODO items with your own, then Run.",
    starter: {
      html: '<h1>My page</h1>\n<p>Welcome!</p>\n<ul>\n  <li>TODO: something you like</li>\n  <li>TODO: another thing</li>\n</ul>\n',
      css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n',
    },
    rubric: { html: ['<ul', '<li'] },
    targets: {
      code: { file: 'index.html', match: 'TODO: something', line: 4, comment: { title: 'Replace the TODO', body: 'Type your own bullet over the TODO. Keep the <li> tags.', code: '<li>Reading</li>' } },
      web: { selector: 'ul', comment: { title: 'Your list', body: 'After you edit and Run, your bullets show here.' } },
    },
    hint: {
      summary: 'Where do I type?',
      steps: [
        'The list is already here. Each <li> is one bullet. Replace the words after "TODO:" with your own — keep the <li> and </li> tags.',
        'Do the same for the second <li> on the next line.',
        'Press Run to see your bulleted list appear.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: 'TODO: something', line: 4, comment: { title: 'Step 1 — first bullet', body: 'Replace the first TODO.', code: '<li>Reading</li>' } } },
        { code: { file: 'index.html', match: 'TODO: another', line: 5, comment: { title: 'Step 2 — second bullet', body: 'Replace the second TODO.', code: '<li>Soccer</li>' } } },
        { code: { file: 'index.html', match: 'TODO: another', line: 5, comment: { title: 'Step 3 — Run it', body: 'Press Run to see your list.' }, }, web: { selector: 'ul', comment: { title: 'Your list', body: 'Run to see it.' } } },
      ],
    },
  },
  // --- polish (stretch) ---
  {
    id: 'lvl-polish-stretch',
    objectiveId: 'obj-polish',
    tier: 'stretch',
    title: 'Make it unmistakably yours',
    instructions:
      "You added an element — now make the page feel finished. Add two distinct elements (e.g. a list AND a blockquote) and give at least one a styled touch with CSS.",
    starter: null,
    rubric: { html: ['<ul', '<li', '<blockquote'] },
    targets: {
      code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Add two elements', body: 'Add both a list and a quote below your paragraph.', code: '<ul>\n  <li>Reading</li>\n  <li>Soccer</li>\n</ul>\n<blockquote>Stay curious.</blockquote>' } },
      web: { selector: 'body', comment: { title: 'A finished feel', body: 'Two elements plus a styled touch make the page feel complete.' } },
    },
    hint: {
      summary: 'How do I make it feel finished?',
      steps: [
        'Add a bulleted list below your paragraph:  <ul><li>Reading</li><li>Soccer</li></ul>',
        'Add a quote too, for variety:  <blockquote>Stay curious.</blockquote>',
        'Style at least one so it stands out — e.g.  blockquote { border-left: 4px solid #4f46e5; padding-left: 12px; color: #374151; }  Then Run.',
      ],
      stepTargets: [
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 1 — a list', body: 'Add a bulleted list.', code: '<ul>\n  <li>Reading</li>\n  <li>Soccer</li>\n</ul>' } } },
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 2 — a quote', body: 'Add a blockquote too.', code: '<blockquote>Stay curious.</blockquote>' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3 — style one', body: 'Give the quote a styled touch.', code: 'blockquote { border-left: 4px solid #4f46e5; padding-left: 12px; }' } }, web: { selector: 'body', comment: { title: 'Finished', body: 'Run to see your finished page.' } } },
      ],
    },
  },
]

export function getLevel(levelId) {
  const canonical = LEVELS.find((l) => l.id === levelId)
  if (canonical) return canonical
  // Also resolve probe/diagnostic variant levels defined in PROBES.
  for (const variants of Object.values(PROBES)) {
    const v = variants.find((l) => l.id === levelId)
    if (v) return v
  }
  return null
}

export function getObjective(objectiveId) {
  return LESSON.objectives.find((o) => o.id === objectiveId) || null
}

export const FIRST_LEVEL_ID = 'lvl-structure-core'

// ---------------------------------------------------------------------------
// Probe pools (diagnostic-placement feature). Each canonical level above is the
// first member of its objective+tier pool; PROBES adds 1-2 interchangeable
// variants that REUSE the canonical rubric (same grading) but change the surface
// task (title / instructions / starter). Used by the diagnostic and by
// confidence re-check probes so a re-check never repeats the exact task. The
// original 12 LEVELS are untouched.
// ---------------------------------------------------------------------------

const rubricOf = (id) => (getLevel(id) || {}).rubric

export const PROBES = {
  // --- structure ---
  'obj-structure:core': [
    {
      id: 'lvl-structure-core-v2', objectiveId: 'obj-structure', tier: 'core',
      title: 'Introduce a project', instructions:
        'Add an <h1> with the name of a project you like and a <p> saying what it does. Then press Run.',
      starter: { html: '<!-- Add an <h1> and a <p> below -->\n', css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n' },
      rubric: rubricOf('lvl-structure-core'),
      targets: { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Add a heading', body: 'An <h1> is the page title. Add it, then a <p> below.', code: '<h1>My Project</h1>' } }, web: { selector: 'body', comment: { title: 'Your page', body: 'Run to see it.' } } },
      hint: { summary: 'How do I add a heading and paragraph?', steps: [
        'A heading is a paired tag: <h1> ... </h1>. Put the project name between them.',
        'Type it on the first line: <h1>My Project</h1>',
        'Then a paragraph below: <p>It helps people learn.</p> and press Run.',
      ], stepTargets: [
        { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Step 1', body: 'Write a heading pair.', code: '<h1></h1>' } } },
        { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Step 2', body: 'Name the project between the tags.', code: '<h1>My Project</h1>' } } },
        { code: { file: 'index.html', match: '<!-- Add an', line: 1, comment: { title: 'Step 3', body: 'Add a paragraph below, then Run.', code: '<p>It helps people learn.</p>' } }, web: { selector: 'body', comment: { title: 'Run it', body: 'See both appear.' } } },
      ] },
    },
  ],
  'obj-structure:support': [
    {
      id: 'lvl-structure-support-v2', objectiveId: 'obj-structure', tier: 'support',
      title: 'Fill in the blanks: a title and a line', instructions:
        'The skeleton is started. Replace each TODO with your own words, keeping the tags, then press Run.',
      starter: { html: '<h1>TODO: a title</h1>\n<p>TODO: one sentence</p>\n', css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n' },
      rubric: rubricOf('lvl-structure-support'),
      targets: { code: { file: 'index.html', match: 'TODO: a title', line: 1, comment: { title: 'Replace the TODO', body: 'Type a title over the TODO. Keep the <h1> tags.', code: '<h1>My Page</h1>' } }, web: { selector: 'h1', comment: { title: 'Your title', body: 'Run to see it.' } } },
      hint: { summary: 'Where do I type?', steps: [
        'Line 1 has TODO between <h1> and </h1>. Only the words are placeholder — the tags stay.',
        'Type your own title over "TODO: a title".',
        'Do the same on line 2 for the paragraph, then Run.',
      ], stepTargets: [
        { code: { file: 'index.html', match: 'TODO: a title', line: 1, comment: { title: 'Step 1', body: 'Find the TODO on line 1.' } } },
        { code: { file: 'index.html', match: 'TODO: a title', line: 1, comment: { title: 'Step 2', body: 'Type your title. Keep the tags.', code: '<h1>My Page</h1>' } } },
        { code: { file: 'index.html', match: 'TODO: one sentence', line: 2, comment: { title: 'Step 3', body: 'Now the paragraph, then Run.', code: '<p>Welcome!</p>' } }, web: { selector: 'h1', comment: { title: 'Your title', body: 'Run to see it.' } } },
      ] },
    },
  ],
  // --- style ---
  'obj-style:core': [
    {
      id: 'lvl-style-core-v2', objectiveId: 'obj-style', tier: 'core',
      title: 'Set a mood with color', instructions:
        'In the CSS, give the body a background color and your <h1> a text color. Try a warm or cool pair. Then Run.',
      starter: null, rubric: rubricOf('lvl-style-core'),
      targets: { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Color the page', body: 'Add a background inside the body rule.', code: 'background: #fff7ed;' } }, web: { selector: 'h1', comment: { title: 'Heading color', body: 'Add an h1 rule.', code: 'h1 { color: #9a3412; }' } } },
      hint: { summary: 'How do I change colors?', steps: [
        'A CSS rule is selector { property: value; }. The body rule is already there.',
        'Add a background inside the body braces: background: #fff7ed;',
        'Add a new rule for the heading color: h1 { color: #9a3412; } then Run.',
      ], stepTargets: [
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 1', body: 'The body rule is here.' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 2', body: 'Add a background line.', code: 'background: #fff7ed;' } } },
        { code: { file: 'styles.css', match: 'font-family', line: 2, comment: { title: 'Step 3', body: 'Add a heading color rule.', code: 'h1 { color: #9a3412; }' } }, web: { selector: 'h1', comment: { title: 'Heading color', body: 'Run to see it.' } } },
      ] },
    },
  ],
  'obj-style:support': [
    {
      id: 'lvl-style-support-v2', objectiveId: 'obj-style', tier: 'support',
      title: 'Fill in the blanks: two colors', instructions:
        'Two TODO colors in the CSS — replace each with a color, then Run.',
      starter: { html: '<h1>My page</h1>\n<p>Welcome!</p>\n', css: 'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n  background: TODO; /* a page color */\n}\n\nh1 {\n  color: TODO; /* a heading color */\n}\n' },
      rubric: rubricOf('lvl-style-support'),
      targets: { code: { file: 'styles.css', match: 'background: TODO', line: 4, comment: { title: 'First TODO', body: 'Type a page color.', code: 'background: #ecfeff;' } }, web: { selector: 'body', comment: { title: 'Page color', body: 'Run to see it.' } } },
      hint: { summary: 'Where do the colors go?', steps: [
        'Line 4: background: TODO; — replace TODO with a color like #ecfeff.',
        'The h1 rule has color: TODO; — replace it with a color like teal.',
        'Press Run to see both.',
      ], stepTargets: [
        { code: { file: 'styles.css', match: 'background: TODO', line: 4, comment: { title: 'Step 1', body: 'Page color.', code: 'background: #ecfeff;' } } },
        { code: { file: 'styles.css', match: 'color: TODO', line: 8, comment: { title: 'Step 2', body: 'Heading color.', code: 'color: teal;' } } },
        { code: { file: 'styles.css', match: 'color: TODO', line: 8, comment: { title: 'Step 3', body: 'Run it.' }, }, web: { selector: 'h1', comment: { title: 'Heading', body: 'Run to see it.' } } },
      ] },
    },
  ],
  // --- layout ---
  'obj-layout:core': [
    {
      id: 'lvl-layout-core-v2', objectiveId: 'obj-layout', tier: 'core',
      title: 'Center a reading column', instructions:
        'In the CSS, cap the body width and center it so lines are easy to read. Then Run.',
      starter: null, rubric: rubricOf('lvl-layout-core'),
      targets: { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Center it', body: 'Add max-width and margin: 0 auto.', code: 'max-width: 640px;\nmargin: 0 auto;' } }, web: { selector: 'body', comment: { title: 'Centered', body: 'Run to see it.' } } },
      hint: { summary: 'How do I center?', steps: [
        'Cap the width in the body rule: max-width: 640px;',
        'Center it with margin: 0 auto;',
        'Add padding: 32px; for breathing room, then Run.',
      ], stepTargets: [
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 1', body: 'Cap the width.', code: 'max-width: 640px;' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 2', body: 'Center it.', code: 'margin: 0 auto;' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3', body: 'Add padding, then Run.', code: 'padding: 32px;' } }, web: { selector: 'body', comment: { title: 'Centered', body: 'Run to see it.' } } },
      ] },
    },
  ],
  'obj-layout:support': [
    {
      id: 'lvl-layout-support-v2', objectiveId: 'obj-layout', tier: 'support',
      title: 'Fill in the blanks: a tidy column', instructions:
        'Two TODOs in the body rule — a max-width and a margin. Replace each, then Run.',
      starter: { html: '<h1>My page</h1>\n<p>A longer line of text that shows why limiting the width makes reading easier for everyone.</p>\n', css: 'body {\n  font-family: system-ui, sans-serif;\n  max-width: TODO; /* e.g. 600px */\n  margin: TODO; /* e.g. 0 auto */\n  padding: 32px;\n}\n' },
      rubric: rubricOf('lvl-layout-support'),
      targets: { code: { file: 'styles.css', match: 'max-width: TODO', line: 3, comment: { title: 'First TODO', body: 'How wide the content can get.', code: 'max-width: 600px;' } }, web: { selector: 'body', comment: { title: 'Narrower', body: 'Run to see it.' } } },
      hint: { summary: 'Which line does what?', steps: [
        'Line 3: max-width: TODO; — replace with 600px.',
        'Line 4: margin: TODO; — replace with 0 auto to center.',
        'Press Run.',
      ], stepTargets: [
        { code: { file: 'styles.css', match: 'max-width: TODO', line: 3, comment: { title: 'Step 1', body: 'Width.', code: 'max-width: 600px;' } } },
        { code: { file: 'styles.css', match: 'margin: TODO', line: 4, comment: { title: 'Step 2', body: 'Center it.', code: 'margin: 0 auto;' } } },
        { code: { file: 'styles.css', match: 'margin: TODO', line: 4, comment: { title: 'Step 3', body: 'Run it.' }, }, web: { selector: 'body', comment: { title: 'Centered', body: 'Run.' } } },
      ] },
    },
  ],
  // --- polish ---
  'obj-polish:core': [
    {
      id: 'lvl-polish-core-v2', objectiveId: 'obj-polish', tier: 'core',
      title: 'Add a finishing element', instructions:
        'Add one more element below your paragraph — a list of favorites or a quote — then Run.',
      starter: null, rubric: rubricOf('lvl-polish-core'),
      targets: { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Add an element', body: 'Add a list below your paragraph.', code: '<ul>\n  <li>Music</li>\n  <li>Hiking</li>\n</ul>' } }, web: { selector: 'body', comment: { title: 'It grows', body: 'Run to see it.' } } },
      hint: { summary: 'Ideas for a finishing touch', steps: [
        'Add a bulleted list below your paragraph: <ul><li>Music</li><li>Hiking</li></ul>',
        'Or a quote instead: <blockquote>Keep building.</blockquote>',
        'Give it a little style, e.g. ul { color: #4f46e5; }, then Run.',
      ], stepTargets: [
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 1', body: 'Add a list.', code: '<ul>\n  <li>Music</li>\n  <li>Hiking</li>\n</ul>' } } },
        { code: { file: 'index.html', match: '</p>', line: 2, comment: { title: 'Step 2', body: 'Or a quote.', code: '<blockquote>Keep building.</blockquote>' } } },
        { code: { file: 'styles.css', match: 'body {', line: 1, comment: { title: 'Step 3', body: 'Style it, then Run.', code: 'ul { color: #4f46e5; }' } }, web: { selector: 'body', comment: { title: 'Finished', body: 'Run to see it.' } } },
      ] },
    },
  ],
}

export function poolKey(objectiveId, tier) {
  return `${objectiveId}:${tier}`
}

// Full pool for an objective+tier: the canonical LEVELS member(s) first, then any
// PROBES variants. Length is 2-3 where a pool is defined, else just the canonical.
export function getPool(objectiveId, tier) {
  const canonical = LEVELS.filter((l) => l.objectiveId === objectiveId && l.tier === tier)
  const variants = PROBES[poolKey(objectiveId, tier)] || []
  return [...canonical, ...variants]
}

