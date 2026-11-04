// Compact line marker for the code editor: an arrow + short label pinned to
// the right margin at the target line's height. It only POINTS at the line —
// the detailed guidance lives in a docked panel below the editor (CodeHintCard)
// so nothing overlaps the code.

const LINE_HEIGHT = 20.8 // 13px * 1.6 (matches .ca-code-area line-height)
const PAD_TOP = 12        // matches .ca-code-area padding-top

function targetLineIndex(code, target) {
  if (!code || !target) return 0
  const lines = code.split('\n')
  if (target.match) {
    const idx = lines.findIndex((l) => l.includes(target.match))
    if (idx >= 0) return idx
  }
  const ln = Math.max(1, Math.min(target.line || 1, lines.length))
  return ln - 1
}

export default function CodeHint({ code, target, scrollTop = 0 }) {
  if (!target) return null
  const c = target.comment
  const label = c && typeof c === 'object' ? c.title || 'Edit here' : 'Edit here'

  const idx = targetLineIndex(code, target)
  const top = PAD_TOP + idx * LINE_HEIGHT - scrollTop + LINE_HEIGHT / 2
  if (top < 0) return null

  return (
    <div className="ca-codehint" style={{ top: `${top}px` }} aria-hidden="true">
      <span className="ca-codehint-arrow">◄</span>
      <span className="ca-codehint-tag">{label}</span>
    </div>
  )
}
