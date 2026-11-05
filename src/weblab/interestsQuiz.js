// Interests quiz: asked before the skill check so the lesson can be built around
// what the student actually likes and wants to make (a game, a sport, a
// portfolio, a cause, and so on). The answers produce a "project profile" that
// personalizes every generated lesson's theme, examples, and project title.
// Local and mocked; this is the seam where richer personalization/model
// prompting would plug in.

export const INTEREST_QUESTIONS = [
  {
    id: 'topic',
    prompt: 'What do you want your website to be about?',
    kind: 'choice-or-other',
    choices: [
      { id: 'gaming', label: 'Gaming or esports', theme: 'a gaming fan page', noun: 'the game' },
      { id: 'sports', label: 'A sport or team I follow or play', theme: 'a sports page', noun: 'the team' },
      { id: 'music', label: 'Music, a band, or an artist', theme: 'a music page', noun: 'the music' },
      { id: 'art', label: 'Art, design, or digital creation', theme: 'an art showcase', noun: 'my work' },
      { id: 'photography', label: 'Photography', theme: 'a photography portfolio', noun: 'my photos' },
      { id: 'movies', label: 'Movies, shows, or anime', theme: 'a movies & TV fan page', noun: 'the shows' },
      { id: 'books', label: 'Writing, books, or a blog', theme: 'a writing blog', noun: 'the writing' },
      { id: 'animals', label: 'Animals or wildlife', theme: 'an animals page', noun: 'the animals' },
      { id: 'food', label: 'Food, cooking, or baking', theme: 'a recipes page', noun: 'the recipes' },
      { id: 'science', label: 'Science, space, or the environment', theme: 'a science page', noun: 'the topic' },
      { id: 'coding', label: 'Coding, tech, or robotics', theme: 'a tech project page', noun: 'the project' },
      { id: 'fashion', label: 'Fashion, style, or streetwear', theme: 'a style page', noun: 'the looks' },
      { id: 'travel', label: 'Travel or a place that matters to me', theme: 'a travel page', noun: 'the place' },
      { id: 'club', label: 'A club, team, or school activity', theme: 'a club page', noun: 'the club' },
      { id: 'cause', label: 'A cause or community issue I care about', theme: 'a page for a cause', noun: 'the cause' },
      { id: 'business', label: 'A small business, brand, or side hustle', theme: 'a small-business site', noun: 'the business' },
      { id: 'me', label: 'Me — a personal site or portfolio', theme: 'a personal portfolio', noun: 'me' },
    ],
    otherLabel: 'Something else',
    otherPlaceholder: 'Describe it in a few words...',
  },
  {
    id: 'audience',
    prompt: 'Who are you making it for?',
    kind: 'choice',
    choices: [
      { id: 'friends', label: 'Friends and classmates' },
      { id: 'fans', label: 'A community or fanbase' },
      { id: 'public', label: 'Anyone online who finds it' },
      { id: 'teachers', label: 'Teachers, colleges, or future employers' },
      { id: 'customers', label: 'Customers or an audience I want to grow' },
    ],
  },
  {
    id: 'goal',
    prompt: 'What is the main thing you want it to do?',
    kind: 'choice',
    choices: [
      { id: 'showcase', label: 'Showcase work, photos, or a collection' },
      { id: 'inform', label: 'Explain or inform people about a topic' },
      { id: 'interactive', label: 'Be interactive — things respond when you click' },
      { id: 'signup', label: 'Get people to join, follow, or sign up' },
      { id: 'express', label: 'Be a creative space to express myself' },
    ],
  },
  {
    id: 'vibe',
    prompt: 'What style or vibe are you going for?',
    kind: 'choice',
    choices: [
      { id: 'clean', label: 'Clean and modern' },
      { id: 'bold', label: 'Bold and high-energy' },
      { id: 'minimal', label: 'Minimal and elegant' },
      { id: 'playful', label: 'Fun and colorful' },
      { id: 'retro', label: 'Retro or pixel / Y2K' },
      { id: 'dark', label: 'Sleek and dark' },
    ],
  },
  {
    id: 'learnfocus',
    prompt: 'What are you most interested in learning?',
    kind: 'choice',
    choices: [
      { id: 'structure', label: 'How to structure a page with HTML', emphasize: 'obj-structure' },
      { id: 'style', label: 'How to style a page with colors and CSS', emphasize: 'obj-style' },
      { id: 'layout', label: 'How to lay things out so they look professional', emphasize: 'obj-layout' },
      { id: 'interactive', label: 'How to add your own elements and polish', emphasize: 'obj-polish' },
      { id: 'everything', label: 'I want a bit of everything', emphasize: null },
    ],
  },
  {
    id: 'experience',
    prompt: 'How much have you coded a website before?',
    kind: 'choice',
    choices: [
      { id: 'never', label: 'Never — this is my first time' },
      { id: 'little', label: 'A little — I have seen some HTML' },
      { id: 'some', label: 'Some — I know a few HTML/CSS basics' },
      { id: 'lots', label: 'A fair amount — I have built pages before' },
    ],
  },
]

export const MIN_REQUIRED = 5 // at least five answered to finish

// Turn raw answers into a project profile the lesson builder consumes.
export function buildProfile(answers = {}) {
  const topicQ = INTEREST_QUESTIONS[0]
  let theme = 'a personal website'
  let subject = 'you'
  if (answers.topic === '__other__' && answers.topicOther?.trim()) {
    theme = answers.topicOther.trim()
    subject = answers.topicOther.trim()
  } else {
    const picked = topicQ.choices.find((c) => c.id === answers.topic)
    if (picked) { theme = picked.theme; subject = picked.noun }
  }
  const goalQ = INTEREST_QUESTIONS[2]
  const vibeQ = INTEREST_QUESTIONS[3]
  const focusQ = INTEREST_QUESTIONS[4]
  const goal = goalQ.choices.find((c) => c.id === answers.goal)?.label || null
  const vibe = vibeQ.choices.find((c) => c.id === answers.vibe)?.id || 'clean'
  const emphasize = focusQ.choices.find((c) => c.id === answers.learnfocus)?.emphasize ?? null

  // A short project title from the theme, Title Cased.
  const title = theme.replace(/^a[n]? /i, '').replace(/\b\w/g, (m) => m.toUpperCase())

  return { theme, subject, goal, vibe, emphasize, title, answers }
}

export function answeredCount(answers = {}) {
  return INTEREST_QUESTIONS.filter((q) => {
    if (q.id === 'topic') return answers.topic && (answers.topic !== '__other__' || answers.topicOther?.trim())
    return !!answers[q.id]
  }).length
}
