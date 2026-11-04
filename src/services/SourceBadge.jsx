import './sourceBadge.css'

// Required by architecture 1.8: canned/stub or fallback content must be visibly
// labelled so it can never pass as live. This small, accessible banner surfaces
// three things from a service response:
//   - source: 'stub' (sample data) or 'rules'/'cache'/'none' on a fallback path
//   - notice: ADAPTIVE_UNAVAILABLE or CONTENT_BLOCKED, shown verbatim to the student
//   - fallbackActive / health: adaptive features currently unavailable
//
// It renders nothing when there is nothing to say (live, no notice, no fallback).

const SOURCE_LABEL = {
  stub: 'Sample data',
  rules: 'Standard lesson (adaptive off)',
  cache: 'Cached result',
  none: 'Not graded',
}

/**
 * @param {object} props
 * @param {string} [props.source] one of ENUMS.Source
 * @param {{ code: string, message: string } | null} [props.notice]
 * @param {boolean} [props.fallbackActive]
 * @param {{ status: 'ok'|'degraded'|'down' } | null} [props.health]
 */
export default function SourceBadge({ source, notice, fallbackActive, health }) {
  const healthDown = health && health.status !== 'ok'
  const adaptiveOff = Boolean(fallbackActive) || Boolean(healthDown)
  const showSource = source === 'stub' || source === 'rules' || source === 'cache'

  // Nothing to report: a live, graded, no-notice response needs no banner.
  if (!showSource && !notice && !adaptiveOff) return null

  const tone = notice?.code === 'CONTENT_BLOCKED' ? 'warn' : adaptiveOff ? 'muted' : 'info'

  return (
    <div className={`sb sb--${tone}`} role="status" aria-live="polite">
      {showSource && (
        <span className="sb-badge" title="Where this content came from">
          {SOURCE_LABEL[source] || source}
        </span>
      )}
      {adaptiveOff && (
        <span className="sb-text">
          Adaptive features are temporarily unavailable. Your lesson keeps going and your work is saved.
        </span>
      )}
      {notice && <span className="sb-text">{notice.message}</span>}
    </div>
  )
}
