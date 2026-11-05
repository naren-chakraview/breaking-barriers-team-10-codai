import { useMemo, useState } from 'react'
import { INTEREST_QUESTIONS, MIN_REQUIRED, answeredCount } from './interestsQuiz.js'

// First screen a student sees: a short preferences quiz about what they like and
// want to build. Its answers personalize the project (theme woven into tasks and
// examples) AND the visual design of the pages. Comes before the skill check.
// Local and mocked; the answers are saved via profileStore.
export default function IntroInterests({ user, onComplete, onSkip }) {
  const [answers, setAnswers] = useState({})
  const name = (user?.username || '').split('@')[0] || 'there'

  const count = useMemo(() => answeredCount(answers), [answers])
  const enough = count >= MIN_REQUIRED

  const set = (qid, value) => setAnswers((a) => ({ ...a, [qid]: value }))

  return (
    <div className="wf wfl idg-screen">
      <div className="idg idg--interests" role="form" aria-labelledby="ii-title">
        <div className="idg-head">
          <span className="idg-badge">Let's make it yours · {INTEREST_QUESTIONS.length} quick questions</span>
          <h1 id="ii-title" className="idg-title">First, {name} — what are you into?</h1>
          <p className="idg-sub">
            Your answers shape your project and the look of your workspace. There are no wrong
            answers. Answer at least {MIN_REQUIRED} to continue.
          </p>
        </div>

        <ol className="idg-questions">
          {INTEREST_QUESTIONS.map((q, qi) => (
            <li key={q.id} className="idg-q">
              <fieldset className="idg-fieldset">
                <legend className="idg-legend"><span className="idg-qn">{qi + 1}</span>{q.prompt}</legend>
                <div className={`ii-choices ${q.id === 'topic' ? 'ii-choices--grid' : ''}`}>
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
                          onChange={() => set(q.id, c.id)}
                        />
                        <span>{c.label}</span>
                      </label>
                    )
                  })}
                  {q.kind === 'choice-or-other' && (
                    <label className={`idg-choice ${answers[q.id] === '__other__' ? 'is-checked' : ''}`} htmlFor={`${q.id}-other`}>
                      <input
                        type="radio"
                        id={`${q.id}-other`}
                        name={q.id}
                        checked={answers[q.id] === '__other__'}
                        onChange={() => set(q.id, '__other__')}
                      />
                      <span>{q.otherLabel}</span>
                    </label>
                  )}
                </div>
                {q.kind === 'choice-or-other' && answers[q.id] === '__other__' && (
                  <input
                    type="text"
                    className="ii-other-input"
                    placeholder={q.otherPlaceholder}
                    aria-label={q.otherLabel}
                    maxLength={80}
                    value={answers[`${q.id}Other`] || ''}
                    onChange={(e) => set(`${q.id}Other`, e.target.value)}
                  />
                )}
              </fieldset>
            </li>
          ))}
        </ol>

        <div className="idg-actions">
          <button type="button" className="wf-btn wf-btn--ghost" onClick={onSkip}>Skip</button>
          <button type="button" className="wf-btn wf-btn--blue" onClick={() => onComplete(answers)} disabled={!enough}>
            {enough ? 'Next: a quick skill check →' : `Answer ${MIN_REQUIRED - count} more`}
          </button>
        </div>
      </div>
    </div>
  )
}
