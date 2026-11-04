import './brand.css'
// The team's AdaptAI logo files live at the repo root. They are imported as-is
// (never edited) and shown through <img>, so nothing inside the SVG can run.
import markUrl from '../favicon.svg'
import fullUrl from '../logo-full.svg'

// Compact mark (64x64, has its own navy tile) for top bars. Decorative: the
// product name is always written next to it as real text.
export function BrandMark({ size = 30 }) {
  return <img className="brand-mark" src={markUrl} alt="" width={size} height={size} />
}

// Full lockup (680x450, transparent with a dark wordmark: use on light surfaces).
export function BrandLogo({ width = 200 }) {
  return (
    <img
      className="brand-logo"
      src={fullUrl}
      alt="AdaptAI"
      width={width}
      height={Math.round((width * 450) / 680)}
    />
  )
}
