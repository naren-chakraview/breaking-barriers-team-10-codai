// Preference-driven visual theme. The interests quiz gives us an interest
// category (gaming, photography, music, …) and a vibe (bold, minimal, dark, …);
// together they pick a palette + feel that is applied across the lesson,
// dashboard and skill tree as CSS custom properties. We evoke a category's
// *feel* (a game theme is blocky/high-contrast, a photography theme is a clean
// gallery) rather than using any brand's assets or names.
//
// Output is a flat map of CSS variables; a provider sets them on a wrapper so
// every scoped stylesheet can read them. Everything has safe fallbacks, so an
// unset or unknown preference just yields the default AdaptAI look.

// Category -> base identity (accent hue family, font feel, label, icon).
const CATEGORY = {
  gaming:      { accent: '#22c55e', accent2: '#16a34a', font: 'pixel',  radius: '6px',  label: 'Game', icon: '🎮' },
  sports:      { accent: '#ea580c', accent2: '#c2410c', font: 'strong', radius: '10px', label: 'Team', icon: '🏆' },
  music:       { accent: '#a855f7', accent2: '#7c3aed', font: 'strong', radius: '14px', label: 'Music', icon: '🎵' },
  art:         { accent: '#ec4899', accent2: '#db2777', font: 'round',  radius: '16px', label: 'Studio', icon: '🎨' },
  photography: { accent: '#0ea5e9', accent2: '#0284c7', font: 'serif',  radius: '4px',  label: 'Gallery', icon: '📷' },
  movies:      { accent: '#ef4444', accent2: '#b91c1c', font: 'strong', radius: '10px', label: 'Screen', icon: '🎬' },
  books:       { accent: '#b45309', accent2: '#92400e', font: 'serif',  radius: '6px',  label: 'Library', icon: '📖' },
  animals:     { accent: '#16a34a', accent2: '#15803d', font: 'round',  radius: '18px', label: 'Wild', icon: '🐾' },
  food:        { accent: '#e11d48', accent2: '#be123c', font: 'round',  radius: '14px', label: 'Kitchen', icon: '🍳' },
  science:     { accent: '#0891b2', accent2: '#0e7490', font: 'mono',   radius: '8px',  label: 'Lab', icon: '🔬' },
  coding:      { accent: '#2563eb', accent2: '#1d4ed8', font: 'mono',   radius: '8px',  label: 'Build', icon: '💻' },
  fashion:     { accent: '#be185d', accent2: '#9d174d', font: 'serif',  radius: '12px', label: 'Style', icon: '👗' },
  travel:      { accent: '#0d9488', accent2: '#0f766e', font: 'round',  radius: '14px', label: 'Journey', icon: '🧭' },
  club:        { accent: '#7c3aed', accent2: '#6d28d9', font: 'strong', radius: '12px', label: 'Club', icon: '🎟️' },
  cause:       { accent: '#059669', accent2: '#047857', font: 'round',  radius: '12px', label: 'Cause', icon: '🌱' },
  business:    { accent: '#1d4ed8', accent2: '#1e40af', font: 'clean',  radius: '8px',  label: 'Brand', icon: '🏷️' },
  me:          { accent: '#4f46e5', accent2: '#4338ca', font: 'clean',  radius: '12px', label: 'Me', icon: '✨' },
}
// A darker shade per category, guaranteed to carry white text at >= 4.5:1.
// Used for button/hero surfaces; the brighter `accent` stays for borders/dots.
const STRONG = {
  gaming: '#15803d', sports: '#c2410c', music: '#7c3aed', art: '#be185d',
  photography: '#0369a1', movies: '#b91c1c', books: '#92400e', animals: '#15803d',
  food: '#be123c', science: '#0e7490', coding: '#1d4ed8', fashion: '#9d174d',
  travel: '#0f766e', club: '#6d28d9', cause: '#047857', business: '#1e40af', me: '#4338ca',
}
const DEFAULT_STRONG = '#4338ca'

const DEFAULT_CATEGORY = { accent: '#4f46e5', accent2: '#4338ca', font: 'clean', radius: '12px', label: 'Project', icon: '🚀' }

// Vibe -> surface feel (page background, surface, text, light/dark).
const VIBE = {
  clean:   { bg: '#f4f7fb', surface: '#ffffff', ink: '#111827', muted: '#4b5563', dark: false },
  bold:    { bg: '#fff5f5', surface: '#ffffff', ink: '#111827', muted: '#4b5563', dark: false, saturate: 1.1 },
  minimal: { bg: '#fafafa', surface: '#ffffff', ink: '#18181b', muted: '#52525b', dark: false },
  playful: { bg: '#fff7ed', surface: '#ffffff', ink: '#1f2937', muted: '#4b5563', dark: false },
  retro:   { bg: '#0f1a0f', surface: '#14281a', ink: '#eafbea', muted: '#9fcf9f', dark: true },
  dark:    { bg: '#0b1220', surface: '#111a2b', ink: '#e5edf7', muted: '#9fb0c7', dark: true },
}
const DEFAULT_VIBE = VIBE.clean

const FONT_STACK = {
  clean:  "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  round:  "'Nunito', 'Segoe UI', system-ui, sans-serif",
  strong: "'Archivo', 'Helvetica Neue', system-ui, sans-serif",
  serif:  "'Georgia', 'Iowan Old Style', serif",
  mono:   "'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace",
  pixel:  "'VT323', ui-monospace, 'Courier New', monospace",
}

/**
 * Build the theme for a project profile (from interestsQuiz.buildProfile).
 * @param {{ answers?: object, vibe?: string }} [profile]
 * @returns {{ id: string, label: string, icon: string, vars: Record<string,string>, dark: boolean }}
 */
export function themeFor(profile) {
  const categoryId = profile?.answers?.topic
  const cat = CATEGORY[categoryId] || DEFAULT_CATEGORY
  const vibeId = profile?.vibe || 'clean'
  const vibe = VIBE[vibeId] || DEFAULT_VIBE
  const font = FONT_STACK[cat.font] || FONT_STACK.clean

  const strong = STRONG[categoryId] || DEFAULT_STRONG
  const vars = {
    '--th-accent': cat.accent,        // bright: borders, dots, focus (on light bg)
    '--th-accent-2': cat.accent2,
    '--th-accent-strong': strong,     // dark enough to carry white text (>= 4.5:1)
    '--th-accent-ink': '#ffffff',
    '--th-bg': vibe.bg,
    '--th-surface': vibe.surface,
    '--th-ink': vibe.ink,
    '--th-muted': vibe.muted,
    '--th-radius': cat.radius,
    '--th-font': font,
    '--th-hero': `linear-gradient(135deg, ${strong} 0%, ${cat.accent2} 100%)`,
    '--th-ring': `${cat.accent}55`,
  }
  return { id: categoryId || 'default', label: cat.label, icon: cat.icon, vars, dark: !!vibe.dark }
}

// Convenience: the inline style object to spread onto a wrapper element.
export function themeStyle(profile) {
  return themeFor(profile).vars
}
