// Mock "build" and "generate" tools for the Web Lab demo. No backend, no model:
// a small HTML/CSS checker that produces a real, teachable build log, and a
// keyword-based generator that turns a plain-language description into code.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PAIRED_TAGS = [
  'h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'blockquote',
  'div', 'span', 'a', 'strong', 'em', 'section', 'header', 'footer', 'nav', 'main', 'button',
]

// Blank out HTML comments (keeping newlines) so tags mentioned inside a
// comment don't count and line numbers stay accurate.
function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
}

export function lintHtml(html) {
  const errors = []
  const clean = stripComments(html || '')
  const lines = clean.split('\n')
  for (const tag of PAIRED_TAGS) {
    const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi')
    const closeRe = new RegExp(`</${tag}\\s*>`, 'gi')
    const opens = (clean.match(openRe) || []).length
    const closes = (clean.match(closeRe) || []).length
    if (opens > closes) {
      let lineNo = 1
      lines.forEach((l, i) => {
        if (new RegExp(`<${tag}(\\s[^>]*)?>`, 'i').test(l)) lineNo = i + 1
      })
      errors.push({ file: 'index.html', line: lineNo, message: `<${tag}> on line ${lineNo} is never closed. Add </${tag}>.` })
    } else if (closes > opens) {
      errors.push({ file: 'index.html', line: 1, message: `Found a </${tag}> with no matching <${tag}>. Remove it or add the opening tag.` })
    }
  }
  return errors
}

export function lintCss(css) {
  const errors = []
  const opens = ((css || '').match(/{/g) || []).length
  const closes = ((css || '').match(/}/g) || []).length
  if (opens > closes) errors.push({ file: 'styles.css', line: 1, message: 'A rule is missing its closing }. Every { needs a matching }.' })
  if (closes > opens) errors.push({ file: 'styles.css', line: 1, message: 'There is an extra } with no matching {.' })
  return errors
}

// Simulated build: checks both files and returns a log a beginner can read.
export async function buildProject({ html, css }) {
  await sleep(500 + Math.random() * 400)
  const htmlErrors = lintHtml(html)
  const cssErrors = lintCss(css)
  const errors = [...htmlErrors, ...cssErrors]
  const log = ['Starting build…']
  log.push(htmlErrors.length ? 'Checking index.html… ✗' : 'Checking index.html… ✓')
  htmlErrors.forEach((e) => log.push(`  error: ${e.message}`))
  log.push(cssErrors.length ? 'Checking styles.css… ✗' : 'Checking styles.css… ✓')
  cssErrors.forEach((e) => log.push(`  error: ${e.message}`))
  log.push(errors.length
    ? `Build failed — ${errors.length} problem${errors.length === 1 ? '' : 's'} to fix.`
    : 'Build passed. Deployed to sandbox.')
  return { ok: errors.length === 0, errors, log }
}

// ---------------------------------------------------------------------------
// Generate: plain-language description -> starter HTML/CSS (keyword based).
// ---------------------------------------------------------------------------

const COLORS = {
  blue: '#2563eb', navy: '#1e3a8a', red: '#dc2626', green: '#16a34a',
  purple: '#7c3aed', pink: '#db2777', orange: '#ea580c', teal: '#0d9488',
}

function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function pickName(text) {
  const m = text.match(/(?:my name is|i am|i'm|called|named)\s+([A-Za-z][\w'-]*(?:\s+[A-Za-z][\w'-]*)?)/i)
  return m ? m[1].trim() : 'Your Name'
}

function pickItems(text) {
  const m = text.match(/(?:hobbies|interests|list of [a-z ]+|favorites?)\s*(?:are|is|:|-|include|like)?\s*([^.\n]+)/i)
  if (!m) return null
  const items = m[1]
    .split(/,|\band\b/i)
    .map((s) => s.trim().replace(/^(a|an|the)\s+/i, ''))
    .filter((s) => s && s.length < 40)
  return items.length ? items.slice(0, 6) : null
}

export async function generateFromRequirements(text) {
  await sleep(700 + Math.random() * 500)
  const t = text || ''
  const name = esc(pickName(t))
  const wantsList = /hobb|interest|list|favorite/i.test(t)
  const wantsPhoto = /photo|picture|image|avatar/i.test(t)
  const colorKey = Object.keys(COLORS).find((c) => new RegExp(`\\b${c}\\b`, 'i').test(t))
  const accent = colorKey ? COLORS[colorKey] : '#4f46e5'

  const parts = [`<h1>${name}</h1>`, '<p>Write one sentence about yourself here.</p>']
  const added = ['a heading', 'a paragraph']
  if (wantsPhoto) { parts.push('<div class="photo" role="img" aria-label="Your photo"></div>'); added.push('a photo placeholder') }
  if (wantsList) {
    const items = pickItems(t) || ['First hobby', 'Second hobby', 'Third hobby']
    parts.push('<h2>My hobbies</h2>', '<ul>', ...items.map((i) => `  <li>${esc(i)}</li>`), '</ul>')
    added.push('a list')
  }

  let css = `body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n}\n\nh1 {\n  color: ${accent};\n}\n`
  if (wantsPhoto) css += '\n.photo {\n  width: 96px;\n  height: 96px;\n  border-radius: 50%;\n  background: #d9dce1;\n}\n'

  return {
    html: parts.join('\n') + '\n',
    css,
    summary: `I drafted ${added.join(', ')} from your description. Read through each tag to see what it does, then change anything you like — Undo is there if you want your old code back.`,
  }
}
