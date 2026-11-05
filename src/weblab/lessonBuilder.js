// Lesson builder: lessons are BUILT from four inputs rather than hard-coded —
//   1) the teacher's assigned CSTA standards (what to learn / the objectives),
//   2) the skill-check score (the starting tier),
//   3) the interests profile (project theme woven into every task + example),
//   4) what the student wants to learn most (which objective is emphasized).
//
// For the built-in HTML/CSS pedagogy we keep the proven teaching structure but
// rewrite the task text, examples and starter around the student's theme. For
// an assigned standard that has no built-in template, we generate a clearly
// labelled auto-generated lesson shell from the standard's statement. Nothing
// here is a network/model call — it is local, deterministic templating. This is
// the seam where real model-authored lessons would plug in.

import { LESSON as BASE_LESSON, LEVELS as BASE_LEVELS } from './courseData.js'

// --- Theme helpers -------------------------------------------------------
// Turn a profile into concrete sample content so examples reference the
// student's topic instead of generic placeholders.
function themeBits(profile) {
  const theme = profile?.theme || 'a personal website'
  const subject = profile?.subject || 'something you like'
  const title = profile?.title || 'My Site'
  // A heading + a sentence + list items, themed.
  return {
    theme,
    title,
    heading: title,
    sentence: `This is ${theme}.`,
    listItems: themeList(profile),
    quote: 'Made by me.',
    accent: vibeAccent(profile?.vibe),
    bg: vibeBg(profile?.vibe),
  }
}
function themeList(profile) {
  const id = profile?.answers?.topic
  const map = {
    gaming: ['Favorite games', 'Best moments', 'Tips & tricks'],
    sports: ['Our schedule', 'The roster', 'Season highlights'],
    music: ['My playlist', 'Favorite artists', 'Songs I love'],
    art: ['My drawings', 'Works in progress', 'Inspiration'],
    photography: ['Portraits', 'Landscapes', 'Street photos'],
    movies: ['Must-watch list', 'Reviews', 'Favorite characters'],
    books: ['What I am reading', 'Reviews', 'My writing'],
    animals: ['About my pet', 'Photos', 'Fun facts'],
    food: ['Recipes', 'Favorite meals', 'Tips'],
    science: ['Cool facts', 'Experiments', 'Questions I have'],
    coding: ['My projects', 'What I am learning', 'Ideas'],
    fashion: ['Outfits', 'Style tips', 'Favorites'],
    travel: ['Places I have been', 'Where I want to go', 'Photos'],
    club: ['When we meet', 'What we do', 'How to join'],
    cause: ['Why it matters', 'How to help', 'Learn more'],
    business: ['What we offer', 'Our hours', 'How to reach us'],
    me: ['About me', 'Things I have made', 'How to reach me'],
  }
  return map[id] || ['Something I like', 'Another thing', 'One more']
}
function vibeAccent(vibe) {
  return { playful: '#f59e0b', clean: '#2563eb', bold: '#dc2626', minimal: '#111827', retro: '#16a34a', dark: '#38bdf8' }[vibe] || '#4f46e5'
}
function vibeBg(vibe) {
  return { playful: '#fff7ed', clean: '#f0f9ff', bold: '#fef2f2', minimal: '#ffffff', retro: '#f0fdf4', dark: '#0f172a' }[vibe] || '#f0f9ff'
}

// Replace the generic sample strings in a built-in level's text/example/starter
// with themed equivalents. We keep the rubric (grading) untouched so difficulty
// is unchanged — only the surface content is personalized.
function personalizeLevel(level, t) {
  const sub = (s) =>
    (s || '')
      .replace(/your name/gi, t.heading)
      .replace(/Alex/g, t.heading)
      .replace(/I like soccer\./g, t.sentence)
      .replace(/one thing you like/gi, t.sentence)
      .replace(/#f0f9ff/g, t.bg)
      .replace(/navy/g, t.accent)
      .replace(/#4f46e5/g, t.accent)
      .replace(/Reading/g, t.listItems[0])
      .replace(/Soccer/g, t.listItems[1])
      .replace(/Stay curious\./g, t.quote)
  const deep = (v) => {
    if (typeof v === 'string') return sub(v)
    if (Array.isArray(v)) return v.map(deep)
    if (v && typeof v === 'object') { const o = {}; for (const k in v) o[k] = deep(v[k]); return o }
    return v
  }
  return {
    ...level,
    instructions: sub(level.instructions),
    starter: level.starter ? { html: sub(level.starter.html), css: sub(level.starter.css) } : level.starter,
    targets: deep(level.targets),
    hint: deep(level.hint),
  }
}

// --- Assigned-standard objectives ---------------------------------------
// When the teacher assigned standards that don't map to a built-in objective,
// generate a lesson shell from the standard statement so the objective still
// has real (if generic) teaching scaffolding, clearly marked auto-generated.
function objectiveFromStandard(std, i) {
  return {
    id: `std-${std.code}`,
    code: std.code,
    title: std.statement,
    minutes: 12,
    canDo: std.statement.replace(/\.$/, '').toLowerCase(),
    generated: true,
    area: std.areaLabel,
    lesson: {
      intro: `This skill comes from the standard your teacher assigned: ${std.code} — ${std.statement}`,
      points: [
        `What it means: ${std.statement}`,
        'Your teacher chose this as something to learn; work through it with the AI tutor for guidance.',
        'Use "Get a hint" if you are unsure where to start.',
      ],
      example: null,
    },
    terms: [],
  }
}

// Map built-in objective id -> its levels (all tiers), personalized.
function builtinLevelsFor(objId, t) {
  return BASE_LEVELS.filter((l) => l.objectiveId === objId).map((l) => personalizeLevel(l, t))
}

// A generic placeholder level for a generated (assigned-standard) objective.
function generatedLevel(obj, tier) {
  return {
    id: `${obj.id}-${tier}`,
    objectiveId: obj.id,
    tier,
    title: obj.title,
    generated: true,
    instructions: `This task is based on the standard ${obj.code}: ${obj.title} Describe, in the editor or to the tutor, how you would approach it. (Auto-generated from your teacher's assigned standard.)`,
    starter: { html: `<!-- ${obj.code}: ${obj.title} -->\n`, css: 'body { font-family: system-ui, sans-serif; padding: 24px; }\n' },
    rubric: { html: ['<'], anyOf: true }, // lenient: any markup counts, since there is no authored checker
    targets: { code: { file: 'index.html', match: obj.code, line: 1, comment: { title: 'Auto-generated task', body: 'This objective came from your teacher. The tutor can guide you.' } } },
    hint: { summary: 'How should I approach this?', steps: [
      `Re-read the goal: ${obj.title}`,
      'Break it into one small step you can try first.',
      'Ask the AI tutor to walk you through it.',
    ], stepTargets: [] },
  }
}

/**
 * Build the whole lesson from the inputs.
 * @param {object} opts
 * @param {Array}  opts.assigned   teacher-assigned standards [{code,statement,areaId,areaLabel}]
 * @param {object} opts.profile    interests profile from buildProfile()
 * @param {string} opts.startTier  'support' | 'core' | 'stretch' (from the skill check)
 * @returns {{ lesson, levels, firstLevelId, generated }}
 */
export function buildLesson({ assigned = [], profile = null, startTier = 'core' } = {}) {
  const t = themeBits(profile)
  const emphasize = profile?.emphasize || null

  let objectives = []
  let levels = []
  let generated = false

  const builtinIds = BASE_LESSON.objectives.map((o) => o.id)
  // Does any assigned standard map to a built-in objective? We don't have a real
  // mapping, so assigned standards are treated as their own generated objectives,
  // and the built-in HTML/CSS objectives are used when there is no assignment.
  if (assigned.length > 0) {
    generated = true
    objectives = assigned.map((std, i) => objectiveFromStandard(std, i))
    levels = objectives.flatMap((obj) => ['support', 'core', 'stretch'].map((tier) => generatedLevel(obj, tier)))
  } else {
    objectives = BASE_LESSON.objectives.map((o) => personalizeObjective(o, t))
    levels = objectives.flatMap((o) => builtinLevelsFor(o.id, t))
  }

  // Emphasis: move the emphasized objective to the front so it is taught first.
  if (emphasize && objectives.some((o) => o.id === emphasize)) {
    objectives = [...objectives.filter((o) => o.id === emphasize), ...objectives.filter((o) => o.id !== emphasize)]
  }

  const lesson = {
    ...BASE_LESSON,
    title: profile?.title ? `${profile.title} — Adaptive Web Lab` : BASE_LESSON.title,
    projectTitle: profile?.title || 'My First Website',
    theme: t.theme,
    objectives,
  }

  // Starting level: first objective, at the skill-check tier (fall back to any).
  const firstObj = objectives[0]?.id
  const first = levels.find((l) => l.objectiveId === firstObj && l.tier === startTier)
    || levels.find((l) => l.objectiveId === firstObj && l.tier === 'core')
    || levels.find((l) => l.objectiveId === firstObj)
  return { lesson, levels, firstLevelId: first?.id, generated }
}

// Personalize an objective's intro/example copy with the theme.
function personalizeObjective(o, t) {
  if (!o.lesson) return o
  const sub = (s) => (s || '')
    .replace(/Alex/g, t.heading)
    .replace(/I like soccer\./g, t.sentence)
    .replace(/#f0f9ff/g, t.bg).replace(/navy/g, t.accent).replace(/#4f46e5/g, t.accent)
    .replace(/Reading/g, t.listItems[0]).replace(/Soccer/g, t.listItems[1]).replace(/Stay curious\./g, t.quote)
  return {
    ...o,
    lesson: {
      ...o.lesson,
      intro: sub(o.lesson.intro),
      example: o.lesson.example ? { ...o.lesson.example, code: sub(o.lesson.example.code), caption: sub(o.lesson.example.caption) } : o.lesson.example,
    },
  }
}
