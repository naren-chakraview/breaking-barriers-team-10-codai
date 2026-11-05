import { useCallback, useEffect, useRef, useState } from 'react'
import { writeProfile, clearProfile } from './profileStore.js'
import { writeProgress, clearProgress } from './progressStore.js'
import { scoreQuiz } from './diagnosticQuiz.js'
import { LESSON } from './courseData.js'
import { writeDemoResult, demoStatusFor } from './demoResultsStore.js'

// Automated playback engine for "Play demo" mode. Given a demo student, it drives
// the full flow as a sequence of staged, PACED, CANCELLABLE steps and writes real
// state to the same stores the UI uses (profileStore, progressStore) plus the
// shared demoResultsStore the teacher page reads.
//
// It does NOT simulate DOM events; it calls the same state-changing functions the
// screens call, which is robust and lets the real UI render the written state.

export const DEMO_STAGES = ['idle', 'signing-in', 'interests', 'skillcheck', 'lesson', 'done']

const STAGE_LABEL = {
  'signing-in': 'Signing in',
  interests: 'Answering the interests quiz',
  skillcheck: 'Taking the skill check',
  lesson: 'Working through the lesson',
  done: 'Lesson complete',
}
export function stageLabel(stage) { return STAGE_LABEL[stage] || '' }

// How many objectives the lesson has. Prefer the real course lesson; the tree
// lesson builds from the same checkpoints, and courseData.LESSON is the canonical
// local objective list used across the student screens.
function totalObjectives() {
  return Array.isArray(LESSON?.objectives) && LESSON.objectives.length
    ? LESSON.objectives.length
    : 4
}

// Per-objective hint count from the hint rate + understanding. Low understanding
// uses hints far more often; strong students rarely do.
function hintsForObjective(student, rand) {
  const base = student.hintRate // 0..1
  // Expected hints per objective roughly scales 0..3 with the rate.
  const draw = rand()
  if (draw < base * 0.5) return 2 + (rand() < base ? 1 : 0) // heavy help
  if (draw < base) return 1
  return 0
}

// Attempts per objective: strong students pass first try; strugglers retry.
function attemptsForObjective(student, rand) {
  if (student.understanding === 'strong') return 1
  if (student.understanding === 'detail') return rand() < 0.5 ? 2 : 1 // redoes cosmetics
  // struggling / low: 1-3 attempts
  return 1 + Math.round(rand() * 2)
}

// A simple seeded RNG so a given student plays out consistently each run.
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export function useDemoRunner({ pace = 1000 } = {}) {
  const [student, setStudent] = useState(null)
  const [stage, setStage] = useState('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [running, setRunning] = useState(false)
  const cancelRef = useRef({ cancelled: false })
  const timerRef = useRef(null)

  const wait = useCallback((ms) => new Promise((resolve, reject) => {
    timerRef.current = setTimeout(() => {
      if (cancelRef.current.cancelled) reject(new Error('cancelled'))
      else resolve()
    }, ms)
  }), [])

  const stop = useCallback(() => {
    cancelRef.current.cancelled = true
    clearTimeout(timerRef.current)
    setRunning(false)
    setStage('idle')
    setStudent(null)
  }, [])

  useEffect(() => () => { cancelRef.current.cancelled = true; clearTimeout(timerRef.current) }, [])

  // Run the full autopilot for a student. Returns a promise that resolves with the
  // final result, or rejects if cancelled.
  const run = useCallback(async (s, { onComplete } = {}) => {
    cancelRef.current = { cancelled: false }
    const rand = makeRng(
      [...s.id].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7),
    )
    const total = totalObjectives()
    setStudent(s)
    setRunning(true)
    setProgress({ done: 0, total })

    try {
      // 1) Sign in.
      setStage('signing-in')
      // Fresh slate for this student so the run starts clean.
      clearProfile(s.username)
      clearProgress(s.username)
      await wait(pace)

      // 2) Interests quiz -> profile.
      setStage('interests')
      writeProfile(s.username, s.interestAnswers)
      await wait(pace)

      // 3) Skill check -> placed tier.
      setStage('skillcheck')
      const quiz = scoreQuiz(s.quizAnswers)
      writeProgress(s.username, { started: true, placedTier: quiz.tier })
      writeDemoResult(s.id, {
        name: s.name,
        understanding: s.understanding,
        tier: quiz.tier,
        quizScore: quiz.score,
        quizMax: quiz.max,
        hintsUsed: 0,
        attempts: 0,
        completedCount: 0,
        totalObjectives: total,
        status: demoStatusFor(s.understanding),
        finished: false,
        stage: 'skillcheck',
      })
      await wait(pace)

      // 4) Lesson: walk the objectives, accumulating hints/attempts and ramping
      //    mastery toward the student's target. Low understanding uses more hints
      //    and climbs slower.
      setStage('lesson')
      const toComplete = s.objectivesToComplete === 'all' ? total : Math.min(s.objectivesToComplete, total)
      let hintsUsed = 0
      let attempts = 0
      const completed = {}
      for (let i = 0; i < toComplete; i += 1) {
        if (cancelRef.current.cancelled) throw new Error('cancelled')
        const objId = LESSON.objectives[i]?.id || `obj-${i}`
        hintsUsed += hintsForObjective(s, rand)
        attempts += attemptsForObjective(s, rand)
        completed[objId] = true
        // Mastery ramps smoothly to the target as objectives complete.
        const frac = (i + 1) / toComplete
        const mastery = Math.round(s.targetMastery * frac)
        writeProgress(s.username, { completed, bestMastery: mastery, started: true })
        writeDemoResult(s.id, {
          hintsUsed,
          attempts,
          completedCount: i + 1,
          mastery,
          totalObjectives: total,
          status: demoStatusFor(s.understanding),
          finished: i + 1 >= total,
          stage: 'lesson',
        })
        setProgress({ done: i + 1, total })
        await wait(Math.max(350, pace * 0.8))
      }

      // 5) Done.
      setStage('done')
      const finalResult = writeDemoResult(s.id, {
        mastery: s.targetMastery,
        finished: toComplete >= total,
        stage: 'done',
      })
      await wait(pace)
      setRunning(false)
      if (onComplete) onComplete(finalResult)
      return finalResult
    } catch (err) {
      // Cancelled (or a timer rejection): leave state as-is but stop running.
      setRunning(false)
      return null
    }
  }, [pace, wait])

  return { student, stage, progress, running, run, stop }
}
