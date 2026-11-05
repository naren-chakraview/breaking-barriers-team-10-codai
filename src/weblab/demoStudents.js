// Demo students for the automated "Play demo" mode. Each student has a preset
// topic/interest profile and a preset "understanding" level. The autopilot
// (demoRunner.js) reads these and drives the full flow — interests quiz, skill
// check, and lesson — so outcomes (starting tier, hint usage, mastery) derive
// from the understanding level, not random chance.
//
// The ids match the teacher roster ids (TeacherView STUDENT_PERSONA), so a run's
// live results overlay cleanly onto the roster the teacher sees.
//
// quizAnswers are chosen so diagnosticQuiz.scoreQuiz yields the intended tier:
//   q-button: b=2, a/d=1, c/e=0   q-layout: d=2, a/b/c=1, e=0   q-debug: d=2, b=1, else 0
//   scoreToTier: <=1 support, >=5 stretch, else core
//
// interestAnswers are a full valid INTEREST_QUESTIONS answer map (>=5 answered).

export const UNDERSTANDING_LABEL = {
  strong: 'Understands the topic well',
  struggling: 'Struggling with the topic',
  detail: 'Capable, over-focuses on details',
  low: 'Low effort / inattentive',
}

export const DEMO_STUDENTS = [
  {
    id: 'stu-quick',
    name: 'Quick Quinn',
    username: 'quinn@school.edu',
    role: 'student',
    topicLabel: 'Gaming / esports',
    understanding: 'strong',
    // High score -> stretch tier.
    quizAnswers: { 'q-button': 'b', 'q-layout': 'd', 'q-debug': 'd' }, // 2+2+2 = 6
    interestAnswers: {
      topic: 'gaming', audience: 'fans', goal: 'interactive',
      vibe: 'bold', learnfocus: 'interactive', experience: 'lots',
    },
    // Outcome shaping (per objective): few hints, high mastery.
    hintRate: 0.1,
    targetMastery: 96,
    objectivesToComplete: 'all',
  },
  {
    id: 'stu-slow',
    name: 'Sam Rivera',
    username: 'sam@school.edu',
    role: 'student',
    topicLabel: 'Music / a favorite artist',
    understanding: 'struggling',
    // Lowest score -> support tier.
    quizAnswers: { 'q-button': 'e', 'q-layout': 'e', 'q-debug': 'e' }, // 0 -> support
    interestAnswers: {
      topic: 'music', audience: 'friends', goal: 'express',
      vibe: 'playful', learnfocus: 'structure', experience: 'never',
    },
    // Leans on hints a lot, finishes lower.
    hintRate: 0.75,
    targetMastery: 62,
    objectivesToComplete: 'all',
  },
  {
    id: 'stu-detail',
    name: 'Dana Lee',
    username: 'dana@school.edu',
    role: 'student',
    topicLabel: 'Art & photography',
    understanding: 'detail',
    // Mid score -> core tier.
    quizAnswers: { 'q-button': 'a', 'q-layout': 'd', 'q-debug': 'b' }, // 1+2+1 = 4 -> core
    interestAnswers: {
      topic: 'art', audience: 'public', goal: 'showcase',
      vibe: 'minimal', learnfocus: 'style', experience: 'some',
    },
    // Capable, but burns attempts on cosmetics -> some hints, mid-high mastery.
    hintRate: 0.4,
    targetMastery: 81,
    objectivesToComplete: 'all',
  },
  {
    id: 'stu-away',
    name: 'Riley Kim',
    username: 'riley@school.edu',
    role: 'student',
    topicLabel: 'Sports / a team',
    understanding: 'low',
    // Low-mid score -> core tier.
    quizAnswers: { 'q-button': 'd', 'q-layout': 'a', 'q-debug': 'a' }, // 1+1+0 = 2 -> core
    interestAnswers: {
      topic: 'sports', audience: 'friends', goal: 'inform',
      vibe: 'clean', learnfocus: 'everything', experience: 'little',
    },
    // Low effort, long gaps -> occasional hints, lower mastery.
    hintRate: 0.5,
    targetMastery: 68,
    objectivesToComplete: 'all',
  },
]

export function getDemoStudent(id) {
  return DEMO_STUDENTS.find((s) => s.id === id) || null
}
