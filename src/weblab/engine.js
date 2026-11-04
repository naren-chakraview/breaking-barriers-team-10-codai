// Simulated adaptive engine for the demo: validation, routing, code-aware
// diagnostics, and the AI tutor. No network, no model — rules + canned content
// that inspect the student's ACTUAL code so help feels responsive.

import { LESSON, LEVELS } from './courseData.js'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// Human-friendly labels for the rubric needles, so diagnostics can talk about
// what's missing in plain language with a concrete example.
export const NEEDLE_INFO = {
  '<h1': { label: 'a heading (<h1>)', example: '<h1>Your Name</h1>' },
  '</h1>': { label: 'a closing </h1> tag', example: '<h1>Your Name</h1>' },
  '<p': { label: 'a paragraph (<p>)', example: '<p>One thing you like</p>' },
  '</p>': { label: 'a closing </p> tag', example: '<p>One thing you like</p>' },
  '<ul': { label: 'a list (<ul>)', example: '<ul><li>Reading</li></ul>' },
  '<li': { label: 'a list item (<li>)', example: '<li>Reading</li>' },
  background: { label: 'a background color', example: 'background: #f0f9ff;' },
  color: { label: 'a text color', example: 'color: navy;' },
  'max-width': { label: 'a max-width', example: 'max-width: 600px;' },
  margin: { label: 'a margin to center it', example: 'margin: 0 auto;' },
}

function has(code, needle) {
  return (code || '').toLowerCase().includes(needle.toLowerCase())
}

// Inspect the student's code against the level rubric. Returns the met/missing
// needles plus a targeted, beginner-friendly message about THEIR gap.
export function diagnose(level, code) {
  const rubric = level.rubric || {}
  const items = []
  ;(rubric.html || []).forEach((n) => items.push({ needle: n, where: 'html', met: has(code.html, n) }))
  ;(rubric.css || []).forEach((n) => items.push({ needle: n, where: 'css', met: has(code.css, n) }))

  const met = items.filter((i) => i.met)
  const missing = items.filter((i) => !i.met)
  const passing = rubric.anyOf ? met.length > 0 : missing.length === 0 && items.length > 0

  // Build a message about the first meaningful gap (deduped by label).
  let message
  if (passing) {
    message = "This looks complete — press Submit & continue when you're ready."
  } else if (met.length === 0) {
    const first = missing[0] && NEEDLE_INFO[missing[0].needle]
    message = first
      ? `You haven't added ${first.label} yet. Try: ${first.example}`
      : "You haven't started this step yet — give it a go, or tap Get a hint."
  } else {
    // Some progress made — name what's still missing.
    const seen = new Set()
    const names = []
    for (const m of missing) {
      const info = NEEDLE_INFO[m.needle]
      const key = info ? info.label : m.needle
      if (!seen.has(key)) { seen.add(key); names.push(info ? info.label : m.needle) }
    }
    const firstMissingInfo = missing.map((m) => NEEDLE_INFO[m.needle]).find(Boolean)
    const example = firstMissingInfo ? ` For example: ${firstMissingInfo.example}` : ''
    message = `Nice start! You still need ${names.slice(0, 2).join(' and ')}.${example}`
  }

  return { passing, met, missing, message }
}

// --- Validation: score the submission against the rubric. ---
export async function validateSubmission(level, code) {
  await delay(700 + Math.random() * 500)
  const { passing, met, missing } = diagnose(level, code)
  const total = met.length + missing.length
  const score = total ? Math.round((met.length / total) * 100) : 0
  return { objectiveId: level.objectiveId, passing, score }
}

// --- Routing: unchanged logic. ---
export async function routeNextLevel(currentLevel, signal, history) {
  await delay(500 + Math.random() * 400)
  const objectives = LESSON.objectives
  const currentObjIndex = objectives.findIndex((o) => o.id === currentLevel.objectiveId)

  if (!signal.passing) {
    const support = LEVELS.find(
      (l) => l.objectiveId === currentLevel.objectiveId && l.tier === 'support' && !history.includes(l.id),
    )
    if (support) return { level: support, reason: 'support' }
    return { level: currentLevel, reason: 'retry' }
  }

  const nextObj = objectives[currentObjIndex + 1]
  if (!nextObj) return { level: null, reason: 'complete' }

  // "Strong" = full marks with no hints on this step and no easier version
  // visited earlier. A student who needed help moves on at the standard pace.
  const struggled =
    (signal.hintsOnLevel || 0) > 0 ||
    (history || []).some((id) => LEVELS.find((l) => l.id === id)?.tier === 'support')
  const strong = signal.score >= 100 && !struggled
  const stretch = LEVELS.find((l) => l.objectiveId === nextObj.id && l.tier === 'stretch')
  if (strong && stretch) return { level: stretch, reason: 'stretch' }

  const core = LEVELS.find((l) => l.objectiveId === nextObj.id && l.tier === 'core')
  return { level: core || null, reason: core ? 'advance' : 'complete' }
}

// --- AI Tutor: intent-matched, code-aware replies. Takes the student's code
// so answers can reference their actual progress. ---
export async function askTutor(level, question, code = { html: '', css: '' }) {
  await delay(500 + Math.random() * 500)
  const q = (question || '').toLowerCase().trim()
  const dx = diagnose(level, code)

  const reply = (text) => ({ reply: text, hint: level.hint })

  // Empty question
  if (!q) return reply("Ask me anything about your code, or tap “Get a hint” and I'll walk you through it step by step.")

  // "Is it right / am I done / check" → use the diagnosis
  if (/\b(done|finished|right|correct|check|good)\b/.test(q)) {
    return reply(dx.passing
      ? "Looks complete to me! Press Submit & continue to move on."
      : `Not quite yet. ${dx.message}`)
  }

  // "Not working / nothing shows / blank"
  if (/(not working|nothing|blank|empty|doesn't|does not|won't|wont show|broken)/.test(q)) {
    return reply(`A blank preview usually means it hasn't run yet, or a tag isn't closed. Press ▸ Run first. ${dx.passing ? '' : dx.message}`)
  }

  // Tag / heading / paragraph help
  if (/(tag|<h1|heading|title)/.test(q)) {
    return reply("A heading uses paired tags: `<h1>` to open and `</h1>` to close, with your text in between — e.g. `<h1>Alex</h1>`. Everything you type between the tags shows up big and bold.")
  }
  if (/(<p|paragraph|sentence|text)/.test(q)) {
    return reply("Use `<p>` for a paragraph: `<p>I like soccer.</p>`. The `<p>` opens it and `</p>` closes it.")
  }
  if (/(close|closing|unclosed)/.test(q)) {
    return reply("Every tag you open needs a matching closing tag with a slash: `<h1>` pairs with `</h1>`, `<p>` with `</p>`. If something looks off, check for a missing closing tag.")
  }

  // Colors
  if (/(color|colour|background)/.test(q)) {
    return reply("Colors go in your CSS. Set the page background with `body { background: #f0f9ff; }` and your heading color with `h1 { color: navy; }`. You can use color names (navy, teal) or hex codes (#4f46e5).")
  }

  // Centering / layout
  if (/(center|centre|middle|layout|wide|spacing)/.test(q)) {
    return reply("To center the page, give the body a `max-width: 600px;` so lines aren't too wide, then `margin: 0 auto;` to push equal space on each side. Add `padding` for breathing room.")
  }

  // Lists / quotes (polish)
  if (/(list|bullet|ul|li)/.test(q)) {
    return reply("A bulleted list uses `<ul>` with `<li>` items inside: `<ul><li>Reading</li><li>Soccer</li></ul>`. Each `<li>` is one bullet.")
  }
  if (/(quote|blockquote)/.test(q)) {
    return reply("For a quote, wrap text in `<blockquote>`: `<blockquote>Stay curious.</blockquote>`.")
  }

  // CSS "how do I write a rule"
  if (/(css|rule|style|property)/.test(q)) {
    return reply("A CSS rule is `selector { property: value; }`. For example `h1 { color: navy; }` colors every `<h1>`. Each line inside the braces ends with a semicolon.")
  }

  // Stuck / help / generic → lead with their specific gap, then offer steps
  if (/(stuck|help|how|what|where|start)/.test(q)) {
    return reply(`${dx.message} Want the full walkthrough? I'll reveal it one step at a time below.`)
  }

  // Fallback still references their progress so it isn't generic.
  return reply(`${dx.message} If you'd like, tap a hint step below and I'll guide you through it.`)
}

// --- Proactive nudge: references the student's actual gap. ---
export function buildNudge(level, code = { html: '', css: '' }) {
  const dx = diagnose(level, code)
  const msg = dx.passing
    ? "You're basically there — press Submit when you're ready, or ask me anything."
    : `Looks like this step is tricky. ${dx.message}`
  return { objectiveId: level.objectiveId, message: msg, hint: level.hint }
}
