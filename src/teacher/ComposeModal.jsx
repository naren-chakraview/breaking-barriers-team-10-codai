import { useEffect, useRef, useState } from 'react'

const MAX = 500

// Small dialog for the two teacher-authored messages: "Message student" and
// "Send a custom hint". Escape or the backdrop closes it; text is required.
export default function ComposeModal({ title, help, submitLabel, onSubmit, onClose }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const ref = useRef(null)

  // The parent re-renders every second (help countdown), so keep the latest
  // onClose in a ref and run these effects once - otherwise focus would be
  // pulled back into the textarea on every tick.
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => { ref.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function submit(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) { setError('Write a short message first.'); return }
    onSubmit(t)
  }

  return (
    <div className="tv-modal-back" onClick={onClose}>
      <form
        className="tv-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tv-compose-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id="tv-compose-title" className="tv-h3">{title}</h2>
        <p className="tv-muted">{help}</p>
        <textarea
          ref={ref}
          className="tv-compose"
          rows={4}
          maxLength={MAX}
          value={text}
          aria-labelledby="tv-compose-title"
          aria-invalid={error ? 'true' : undefined}
          onChange={(e) => { setText(e.target.value); setError(null) }}
        />
        <div className="tv-compose-foot">
          <span className="tv-tiny" role={error ? 'alert' : undefined}>{error || `${text.length}/${MAX}`}</span>
          <span className="tv-compose-actions">
            <button type="button" className="tv-btn tv-btn--light tv-btn--xs" onClick={onClose}>Cancel</button>
            <button type="submit" className="tv-btn tv-btn--blue tv-btn--xs">{submitLabel}</button>
          </span>
        </div>
      </form>
    </div>
  )
}
