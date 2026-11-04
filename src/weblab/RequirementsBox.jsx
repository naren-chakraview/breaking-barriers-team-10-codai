import { useState } from 'react'

const MAX = 5000

// Center-top card from the wireframe: describe what you want to build in plain
// language, then "Generate / Update" the code, or "Ask a question" to send the
// text to the AI Tutor. Guards: required input, 5,000 character limit, and a
// processing state that disables the controls while generating.
export default function RequirementsBox({ onGenerate, onAsk }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  const trimmed = text.trim()

  async function generate() {
    if (!trimmed) { setMessage('Type a few words about what you want to build first.'); return }
    setMessage(null)
    setBusy(true)
    try {
      const res = await onGenerate(trimmed)
      if (res && res.cancelled) setMessage(null)
      else setMessage('Draft added to your editor. Check it out!')
    } catch {
      setMessage('Something went wrong generating code. Your text is still here — try again.')
    } finally {
      setBusy(false)
    }
  }

  function ask() {
    if (!trimmed) { setMessage('Type your question first, then press Ask a question.'); return }
    setMessage(null)
    onAsk(trimmed)
    setText('') // the question now lives in the tutor chat
  }

  return (
    <section className="wf-card wf-req" aria-label="Requirements">
      <h2 id="wf-req-title" className="wf-card-title">Describe what you want to build</h2>
      <p className="wf-muted wf-req-sub">
        Type requirements in plain language — the AI helps you turn them into code
      </p>
      <textarea
        id="wf-req-input"
        aria-labelledby="wf-req-title"
        className="wf-req-input"
        rows={3}
        maxLength={MAX}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        placeholder={'e.g. "A homepage with my name, a photo, and a list of hobbies..."'}
      />
      <div className="wf-req-actions">
        <button type="button" className="wf-btn wf-btn--light" onClick={ask} disabled={busy}>
          Ask a question
        </button>
        <span className="wf-req-msg" role="status">{busy ? 'Generating code…' : message}</span>
        <button type="button" className="wf-btn wf-btn--blue" onClick={generate} disabled={busy}>
          {busy ? 'Working…' : 'Generate / Update'}
        </button>
      </div>
    </section>
  )
}
