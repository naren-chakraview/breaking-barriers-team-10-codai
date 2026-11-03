// Simulated adaptive engine for the demo: validation, routing, and the AI
// tutor. No network, no model — just rules + canned content with a little
// artificial latency so the UI shows real loading/validating states.

import { LESSON, LEVELS, getLevel } from './courseData.js'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// --- Validation: score the student's submission against the level rubric. ---
// Returns a mastery signal { passing, score } for the level's objective.
export async function validateSubmission(level, code) {
  await delay(700 + Math.random() * 500) // feels like real evaluation

  const rubric = level.rubric || {}
  const checks = []
  if (rubric.html) {
    for (const needle of rubric.html) {
      checks.push(code.html.toLowerCase().includes(needle.toLowerCase()))
    }
  }
  if (rubric.css) {
    for (const needle of rubric.css) {
      checks.push(code.css.toLowerCase().includes(needle.toLowerCase()))
    }
  }

  let passed
  const hits = checks.filter(Boolean).length
  if (rubric.anyOf) {
    passed = hits > 0
  } else {
    passed = checks.length > 0 && hits === checks.length
  }

  // Score is the proportion of rubric checks met, scaled 0-100.
  const score = checks.length ? Math.round((hits / checks.length) * 100) : 0
  return { objectiveId: level.objectiveId, passing: passed, score }
}

// --- Routing: pick the next level from the authored curriculum based on the
// accumulated signal. Same objectives for everyone; struggling students get a
// support tier, fast/accurate students can get a stretch tier. ---
export async function routeNextLevel(currentLevel, signal, history) {
  await delay(500 + Math.random() * 400)

  const objectives = LESSON.objectives
  const currentObjIndex = objectives.findIndex(
    (o) => o.id === currentLevel.objectiveId,
  )

  // If the student did NOT pass, keep them on the same objective but drop to a
  // support-tier level if one exists and they haven't seen it yet.
  if (!signal.passing) {
    const support = LEVELS.find(
      (l) =>
        l.objectiveId === currentLevel.objectiveId &&
        l.tier === 'support' &&
        !history.includes(l.id),
    )
    if (support) return { level: support, reason: 'support' }
    // No support level available: let them retry the current one.
    return { level: currentLevel, reason: 'retry' }
  }

  // Passed. Move to the next objective.
  const nextObj = objectives[currentObjIndex + 1]
  if (!nextObj) {
    return { level: null, reason: 'complete' } // lesson finished
  }

  // For the next objective, send a strong performer (high score, no support
  // needed so far) to a stretch level when one exists.
  const strong = signal.score >= 100
  const stretch = LEVELS.find(
    (l) => l.objectiveId === nextObj.id && l.tier === 'stretch',
  )
  if (strong && stretch) return { level: stretch, reason: 'stretch' }

  const core = LEVELS.find(
    (l) => l.objectiveId === nextObj.id && l.tier === 'core',
  )
  return { level: core || null, reason: core ? 'advance' : 'complete' }
}

// --- AI Tutor: canned, scaffolded responses. Returns the level's hint as a
// step list the UI reveals one step at a time. ---
export async function askTutor(level, question) {
  await delay(600 + Math.random() * 500)
  const q = (question || '').toLowerCase()

  // A couple of lightweight intent matches so chat feels responsive.
  if (q.includes('color') || q.includes('colour')) {
    return {
      reply:
        "Colors live in your CSS. Try a rule like `body { background: #f0f9ff; }` for the page, and `h1 { color: navy; }` for your heading. Want me to walk through it step by step?",
      hint: level.hint,
    }
  }
  if (q.includes('center') || q.includes('centre') || q.includes('middle')) {
    return {
      reply:
        'To center your content, give the body a `max-width` and then `margin: 0 auto;`. That caps the width and pushes equal space to each side.',
      hint: level.hint,
    }
  }
  if (q.includes('stuck') || q.includes('help') || q.includes('how')) {
    return {
      reply:
        "No problem — let's break it down. I'll reveal one step at a time so you can try each part yourself.",
      hint: level.hint,
    }
  }

  return {
    reply:
      "Good question! Here's a hint to get you moving. I'll show it one step at a time so you stay in the driver's seat.",
    hint: level.hint,
  }
}

// --- Proactive nudge: given the student's recent activity, decide whether the
// tutor should offer help unprompted. The UI calls this; here we just package
// the level's hint as the nudge content. ---
export function buildNudge(level) {
  return {
    objectiveId: level.objectiveId,
    message:
      "Looks like this step is tricky — want a hint? I'll reveal it one piece at a time.",
    hint: level.hint,
  }
}
