// Detailed guidance for the current code target, docked below the editor so it
// never overlaps the code. Shows a title, a plain-language body, and an
// optional copy-ready code example.
export default function CodeHintCard({ target }) {
  if (!target) return null
  const c = target.comment
  const info = c && typeof c === 'object' ? c : { body: c }

  return (
    <div className="ca-hintcard" role="note">
      <span className="ca-hintcard-badge">💡 Hint</span>
      <div className="ca-hintcard-main">
        {info.title && <div className="ca-hintcard-title">{info.title}</div>}
        {info.body && <div className="ca-hintcard-body">{info.body}</div>}
      </div>
      {info.code && <pre className="ca-hintcard-code">{info.code}</pre>}
    </div>
  )
}
