import { useMemo, useState } from 'react'
import { QUIZ_QUESTIONS, scoreQuiz, tierBlurb, tierLabel } from './diagnosticQuiz.js'

// Pre-project skill check shown once before the lesson starts. Three quick
// questions; the answers are scored into a starting tier so the adaptive engine
// can rank the student's initial skill and begin at the right level. The student
// may skip (which starts them at the standard tier). Fully local, no backend.
export default function IntroDiagnostic({ user, theme, onComplete, onSkip }) {
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)

  const answeredAll = QUIZ_QUESTIONS.every((q) => answers[q.id])
  const name = (user?.username || '').split('@')[0] || 'there'

  function submit() {
    const r = scoreQuiz(answers)
    setResult(r)
  }

  if (result) {
    return (
      <div className={`wf wfl idg-screen th th--${theme?.id || 'default'}${theme?.dark ? ' th--dark' : ''}`} style={theme?.vars}>
        <div className="idg idg--result" role="dialog" aria-labelledby="idg-done-title" aria-modal="true">
          <span className="idg-badge">Skill check complete</span>
          <h1 id="idg-done-title" className="idg-done-title">Nice — we've got a starting point.</h1>
          <p className="idg-done-sub">
            You scored <strong>{result.score} of {result.max}</strong>.
            {' '}Starting level: <span className={`idg-tier idg-tier--${result.tier}`}>{tierLabel(result.tier)}</span>
          </p>
          <p className="idg-done-blurb">{tierBlurb(result.tier)} You can always move up or down as you go.</p>
          <button type="button" className="wf-btn wf-btn--blue idg-cta" onClick={() => onComplete(result)}>
            Start my project →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`wf wfl idg-screen th th--${theme?.id || 'default'}${theme?.dark ? ' th--dark' : ''}`} style={theme?.vars}>
      <div className="idg" role="form" aria-labelledby="idg-title">
        <div className="idg-head">
          <span className="idg-badge">Quick skill check · 3 questions</span>
          <h1 id="idg-title" className="idg-title">Before we start, {name}</h1>
          <p className="idg-sub">
            Answer three quick questions so we can match the project to what you already know.
            There are no wrong answers — "I'm not sure" is fine, it just helps us start you in the right place.
          </p>
        </div>

        <ol className="idg-questions">
          {QUIZ_QUESTIONS.map((q, qi) => (
            <li key={q.id} className="idg-q">
              <fieldset className="idg-fieldset">
                <legend className="idg-legend"><span className="idg-qn">{qi + 1}</span>{q.prompt}</legend>
                {q.code && <pre className="idg-code">{q.code}</pre>}
                {q.followup && <p className="idg-followup">{q.followup}</p>}
                <div className="idg-choices">
                  {q.choices.map((c) => {
                    const id = `${q.id}-${c.id}`
                    const checked = answers[q.id] === c.id
                    return (
                      <label key={c.id} className={`idg-choice ${checked ? 'is-checked' : ''}`} htmlFor={id}>
                        <input
                          type="radio"
                          id={id}
                          name={q.id}
                          checked={checked}
                          onChange={() => setAnswers((a) => ({ ...a, [q.id]: c.id }))}
                        />
                        <span>{c.text}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>

        <div className="idg-actions">
          <button type="button" className="wf-btn wf-btn--ghost" onClick={onSkip}>Skip for now</button>
          <button type="button" className="wf-btn wf-btn--blue" onClick={submit} disabled={!answeredAll}>
            {answeredAll ? 'See my starting level' : `Answer all 3 (${Object.keys(answers).length}/3)`}
          </button>
        </div>
      </div>
    </div>
  )
}
