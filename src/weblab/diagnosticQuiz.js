// Pre-project skill check: three quick multiple-choice questions, asked BEFORE
// the student starts the project, so the adaptive engine can rank their initial
// skill and pick a starting tier (support / core / stretch) instead of everyone
// beginning at the standard level.
//
// The questions are the three "which instruction works best" diagnostics defined
// in the repo's skill tree (database/sample-skilltree.json, Q103/Q104/Q105).
// Each choice is scored 0-2: 2 = the strong, specific answer; 1 = partially
// right; 0 = vague / "not sure". The total (0-6) maps to a starting tier.
//
// No backend — scoring is a pure local heuristic.

export const QUIZ_QUESTIONS = [
  {
    id: 'q-button',
    sourceId: 103,
    prompt: 'You want a button that changes color when someone clicks it. Which instruction would work best?',
    choices: [
      { id: 'a', text: 'Style the button with a blue background color.', score: 1 },
      { id: 'b', text: "Add a click event that changes the button's color.", score: 2 },
      { id: 'c', text: 'Make the button look better and work better.', score: 0 },
      { id: 'd', text: 'Add a button element that says "Click me."', score: 1 },
      { id: 'e', text: "I'm not sure.", score: 0 },
    ],
  },
  {
    id: 'q-layout',
    sourceId: 104,
    prompt: 'You want a page with a heading and three cards in a row. Which instruction would work best?',
    choices: [
      { id: 'a', text: 'Add a heading and three cards.', score: 1 },
      { id: 'b', text: 'Add an h1 and three div elements.', score: 1 },
      { id: 'c', text: 'Add an h1, then place three cards side by side.', score: 1 },
      { id: 'd', text: 'Use flexbox to lay out three card divs in a row.', score: 2 },
      { id: 'e', text: "I'm not sure.", score: 0 },
    ],
  },
  {
    id: 'q-debug',
    sourceId: 105,
    prompt: 'Your heading looks wrong, and everything after it is huge too. You open the code and see:',
    code: '<h1>Panda Fan Club\n<p>Welcome to the club!</p>',
    followup: 'Which instruction to the AI would work best?',
    choices: [
      { id: 'a', text: "It's broken. Fix it.", score: 0 },
      { id: 'b', text: 'Add a CSS rule to fix the heading color.', score: 1 },
      { id: 'c', text: 'Update the click handler so the heading changes.', score: 0 },
      { id: 'd', text: 'Close the h1 tag after "Panda Fan Club".', score: 2 },
      { id: 'e', text: "I'm not sure.", score: 0 },
    ],
  },
]

export const MAX_SCORE = QUIZ_QUESTIONS.reduce((n, q) => n + Math.max(...q.choices.map((c) => c.score)), 0) // 6

// Map a total quiz score (0-6) to a starting tier. Low -> extra support, mid ->
// standard, high -> a deeper start. Thresholds are deliberately simple so the
// ranking is easy to explain in the UI.
export function scoreToTier(score) {
  if (score <= 1) return 'support'
  if (score >= 5) return 'stretch'
  return 'core'
}

// Score a map of { questionId: choiceId } into { score, max, tier, perQuestion }.
export function scoreQuiz(answers) {
  let score = 0
  const perQuestion = QUIZ_QUESTIONS.map((q) => {
    const choice = q.choices.find((c) => c.id === answers?.[q.id])
    const got = choice ? choice.score : 0
    score += got
    return { questionId: q.id, choiceId: choice?.id ?? null, got, best: Math.max(...q.choices.map((c) => c.score)) }
  })
  return { score, max: MAX_SCORE, tier: scoreToTier(score), perQuestion }
}

const TIER_BLURB = {
  support: "We'll start with extra guidance and smaller steps, and build up from there.",
  core: "We'll start at the standard pace — you've got a solid base to build on.",
  stretch: "You clearly know the basics, so we'll start with a deeper challenge.",
}
export function tierBlurb(tier) { return TIER_BLURB[tier] || TIER_BLURB.core }

const TIER_LABEL = { support: 'Guided start', core: 'Standard start', stretch: 'Challenge start' }
export function tierLabel(tier) { return TIER_LABEL[tier] || TIER_LABEL.core }
