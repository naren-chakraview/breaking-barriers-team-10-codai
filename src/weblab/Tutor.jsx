import { useState } from 'react'
import { askTutor } from './engine.js'

// Left-column "AI TUTOR" panel, styled to match the CodeAI Web Lab layout:
// a tutor message/chat area, scaffolded step-by-step hints, the adaptive
// objectives + mastery tucked in (our spec's blend), a chat input with an
// "Add file" affordance, and a "Back to map" button. Responses are simulated.
export default function Tutor({
  level,
  objectives,
  completed,
  mastery,
  hintsUsed,
  timeStr,
  nudge,
  onDismissNudge,
  onHintRevealed,
  onBackToMap,
}) {
  const [messages, setMessages] = useState([
    {
      role: 'tutor',
      text: 'Work on your project here! Ask me anything, or I will offer a hint if you get stuck.',
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [hint, setHint] = useState(null) // { steps, revealed }

  function startHint(h) {
    if (!h) return
    setHint({ steps: h.steps, revealed: 1 })
    onHintRevealed?.()
  }

  function revealNext() {
    setHint((prev) => {
      if (!prev || prev.revealed >= prev.steps.length) return prev
      onHintRevealed?.()
      return { ...prev, revealed: prev.revealed + 1 }
    })
  }

  async function send(e) {
    e?.preventDefault()
    const q = input.trim()
    if (!q || thinking) return
    setMessages((m) => [...m, { role: 'student', text: q }])
    setInput('')
    setThinking(true)
    const res = await askTutor(level, q)
    setThinking(false)
    setMessages((m) => [...m, { role: 'tutor', text: res.reply }])
    if (res.hint) startHint(res.hint)
  }

  function acceptNudge() {
    const h = nudge?.hint
    onDismissNudge?.()
    setMessages((m) => [...m, { role: 'tutor', text: "Here's a hint — one step at a time." }])
    startHint(h)
  }

  const total = objectives?.length ?? 0
  const doneCount = Object.keys(completed || {}).length

  return (
    <div className="ca-tutor">
      <div className="ca-panel-head">AI TUTOR</div>

      <div className="ca-tutor-body">
        <div className="ca-tutor-intro">{messages[0].text}</div>

        {/* Adaptive tracking tucked into the tutor panel (spec blend) */}
        <div className="ca-track">
          <div className="ca-track-row">
            <span className="ca-track-label">Objectives</span>
            <span className="ca-track-val">{doneCount}/{total}</span>
          </div>
          <ul className="ca-track-objs">
            {objectives?.map((o) => {
              const isDone = completed?.[o.id]
              const isActive = o.id === level.objectiveId
              return (
                <li key={o.id} className={`ca-track-obj ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}>
                  <span aria-hidden="true">{isDone ? '✓' : isActive ? '▸' : '○'}</span>
                  {o.title}
                </li>
              )
            })}
          </ul>
          <div className="ca-track-stats">
            <span>Mastery <strong>{mastery == null ? '—' : mastery}</strong></span>
            <span>Hints <strong>{hintsUsed}</strong></span>
            <span>Time <strong>{timeStr}</strong></span>
          </div>
        </div>

        {nudge && (
          <div className="ca-nudge" role="status">
            <p>{nudge.message}</p>
            <div className="ca-nudge-actions">
              <button type="button" className="ca-btn ca-btn--primary ca-btn--sm" onClick={acceptNudge}>Show a hint</button>
              <button type="button" className="ca-btn ca-btn--ghost ca-btn--sm" onClick={onDismissNudge}>Dismiss</button>
            </div>
          </div>
        )}

        <div className="ca-chat">
          {messages.slice(1).map((m, i) => (
            <div key={i} className={`ca-msg ca-msg--${m.role}`}>{m.text}</div>
          ))}
          {hint && (
            <div className="ca-hint">
              <div className="ca-hint-label">Hint — step {hint.revealed} of {hint.steps.length}</div>
              <ol className="ca-hint-steps">
                {hint.steps.slice(0, hint.revealed).map((s, i) => <li key={i}>{s}</li>)}
              </ol>
              {hint.revealed < hint.steps.length ? (
                <button type="button" className="ca-btn ca-btn--outline ca-btn--sm" onClick={revealNext}>Reveal next step</button>
              ) : (
                <p className="ca-hint-done">That's the last step — you've got this!</p>
              )}
            </div>
          )}
          {thinking && <div className="ca-msg ca-msg--tutor ca-msg--thinking">Thinking…</div>}
        </div>
      </div>

      <form className="ca-chat-input" onSubmit={send}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a chat message…"
          aria-label="Ask the AI Tutor a question"
        />
        <button type="button" className="ca-addfile" title="Add file" aria-label="Add file">+ Add file</button>
        <button type="submit" className="ca-send" disabled={thinking} aria-label="Send message">↑</button>
      </form>

      <button type="button" className="ca-backmap" onClick={onBackToMap}>
        Back to map →
      </button>
    </div>
  )
}
