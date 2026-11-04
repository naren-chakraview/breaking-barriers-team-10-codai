import { useEffect, useRef, useState } from 'react'
import { askTutor } from './engine.js'

// Right-bottom card from the wireframe: the AI Tutor. Shows a proactive nudge
// bubble, the chat (student / tutor messages), scaffolded hints revealed one
// step at a time, an always-available "Get a hint", and the chat input.
// Responses are simulated (no model). `incoming` lets other parts of the page
// talk to the tutor: { id, kind: 'ask' | 'say', text }.
const INTRO = {
  role: 'tutor',
  text: 'Hi! Build in the editor and press Run anytime. Ask me a question, or tap “Get a hint” whenever you want one.',
}

export default function Tutor({
  level,
  code,
  nudge,
  onDismissNudge,
  onHintRevealed,
  onActiveStepTarget,
  incoming,
}) {
  const [messages, setMessages] = useState([INTRO])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [hint, setHint] = useState(null) // { steps, revealed }
  const endRef = useRef(null)
  const handledRef = useRef(null)

  // New level -> clear any showing hint so "Get a hint" targets this level.
  useEffect(() => { setHint(null) }, [level.id])

  // Report the revealed hint step's target so the inline arrow follows it.
  useEffect(() => {
    if (!onActiveStepTarget) return
    if (!hint) { onActiveStepTarget(null); return }
    onActiveStepTarget(level.hint?.stepTargets?.[hint.revealed - 1] || null)
  }, [hint, level.id, onActiveStepTarget])

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [messages, hint, thinking])

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

  function getHint() {
    if (!hint) startHint(level.hint)
    else revealNext()
  }

  async function ask(question) {
    const q = (question || '').trim()
    if (!q || thinking) return
    setMessages((m) => [...m, { role: 'student', text: q }])
    setThinking(true)
    const res = await askTutor(level, q, code)
    setThinking(false)
    setMessages((m) => [...m, { role: 'tutor', text: res.reply }])
    if (res.hint) startHint(res.hint)
  }

  // Messages sent from elsewhere on the page (Ask a question / Generate).
  useEffect(() => {
    if (!incoming || handledRef.current === incoming.id) return
    handledRef.current = incoming.id
    if (incoming.kind === 'ask') ask(incoming.text)
    else setMessages((m) => [...m, { role: 'tutor', text: incoming.text }])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming])

  function send(e) {
    e.preventDefault()
    const q = input
    setInput('')
    ask(q)
  }

  function acceptNudge() {
    const h = nudge?.hint
    onDismissNudge?.()
    setMessages((m) => [...m, { role: 'tutor', text: "Here's a hint — one step at a time." }])
    startHint(h)
  }

  const hintExhausted = hint && hint.revealed >= hint.steps.length

  return (
    <section className="wf-card wf-tutor" aria-label="AI Tutor">
      <div className="wf-card-head">
        <h2 className="wf-card-title wf-tutor-title">
          <span className="wf-tutor-dot" aria-hidden="true" />
          AI Tutor
        </h2>
        {nudge && <span className="wf-pill-nudge">💡 nudge available</span>}
      </div>

      <div className="wf-chat" aria-live="polite">
        {nudge && (
          <div className="wf-nudge" role="status">
            <p className="wf-nudge-title">I noticed you might be stuck 🤔</p>
            <p className="wf-nudge-text">{nudge.message}</p>
            <div className="wf-nudge-actions">
              <button type="button" className="wf-btn wf-btn--blue wf-btn--xs" onClick={acceptNudge}>Show hint</button>
              <button type="button" className="wf-btn wf-btn--ghost wf-btn--xs" onClick={onDismissNudge}>Dismiss</button>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`wf-msg wf-msg--${m.role}`}>{m.text}</div>
        ))}

        {hint && (
          <div className="wf-hint">
            <div className="wf-hint-label">Hint — step {hint.revealed} of {hint.steps.length}</div>
            <ol className="wf-hint-steps">
              {hint.steps.slice(0, hint.revealed).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            {hint.revealed < hint.steps.length ? (
              <button type="button" className="wf-link" onClick={revealNext}>
                Reveal step {hint.revealed + 1} of {hint.steps.length} →
              </button>
            ) : (
              <p className="wf-hint-done">That's the last step — you've got this!</p>
            )}
          </div>
        )}

        {thinking && <div className="wf-msg wf-msg--tutor wf-msg--thinking">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="wf-tutor-foot">
        <button
          type="button"
          className="wf-btn wf-btn--soft wf-btn--xs wf-gethint"
          onClick={getHint}
          disabled={hintExhausted}
        >
          💡 {hintExhausted ? 'No more hints' : hint ? 'Next hint step' : 'Get a hint'}
        </button>
        <form className="wf-chat-input" onSubmit={send}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the tutor anything..."
            aria-label="Ask the tutor anything"
            maxLength={2000}
          />
          <button type="submit" className="wf-btn wf-btn--purple wf-btn--pill" disabled={thinking || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </section>
  )
}
