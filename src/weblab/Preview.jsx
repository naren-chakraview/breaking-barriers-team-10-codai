import { useMemo } from 'react'

// Right column: a browser-style preview matching the CodeAI Web Lab layout.
// The iframe runs with allow-scripts so we can inject a highlighter that rings
// a target element and shows a structured comment (title / body / code). The
// injected script is our own; content is the student's HTML/CSS.
export default function Preview({ html, css, onRun, outOfDate, highlight }) {
  const srcDoc = useMemo(() => {
    // Normalise the comment (string or { title, body, code }) into a payload.
    let payload = 'null'
    if (highlight?.selector) {
      const c = highlight.comment
      const obj = c && typeof c === 'object' ? c : { body: c || '' }
      payload = JSON.stringify({
        selector: highlight.selector,
        title: obj.title || '',
        body: obj.body || '',
        code: obj.code || '',
      })
    }

    const script = `
      <script>
        (function () {
          var H = ${payload};
          function esc(t){var d=document.createElement('div');d.textContent=t;return d.innerHTML;}
          function clear(){document.querySelectorAll('[data-wl-hl]').forEach(function(n){n.remove();});}
          function place() {
            clear();
            if (!H) return;
            var el = document.querySelector(H.selector);
            if (!el) return;
            var r = el.getBoundingClientRect();

            var ring = document.createElement('div');
            ring.setAttribute('data-wl-hl', '1');
            ring.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;'
              + 'left:' + (r.left - 4) + 'px;top:' + (r.top - 4) + 'px;'
              + 'width:' + (r.width + 8) + 'px;height:' + (r.height + 8) + 'px;'
              + 'border:2px dashed #f59e0b;border-radius:6px;'
              + 'box-shadow:0 0 0 9999px rgba(15,23,42,0.04);';
            document.body.appendChild(ring);

            var tip = document.createElement('div');
            tip.setAttribute('data-wl-hl', '1');
            var inner = '';
            if (H.title) inner += '<div style="font-weight:800;color:#fbbf24;font-size:12px;margin-bottom:3px;">\\uD83D\\uDC49 ' + esc(H.title) + '</div>';
            if (H.body)  inner += '<div style="font-size:12px;line-height:1.45;color:#f3f4f6;">' + esc(H.body) + '</div>';
            if (H.code)  inner += '<pre style="margin:7px 0 0;padding:6px 8px;background:#0b1220;color:#e5e7eb;border-radius:6px;font:11px/1.5 ui-monospace,Consolas,monospace;white-space:pre;overflow-x:auto;">' + esc(H.code) + '</pre>';
            tip.innerHTML = inner;

            var tipWidth = Math.min(300, Math.max(180, window.innerWidth - 16));
            var tipLeft = Math.min(Math.max(8, r.left), window.innerWidth - tipWidth - 8);
            var tipTop = r.bottom + 8;
            tip.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;'
              + 'left:' + tipLeft + 'px;top:' + tipTop + 'px;width:' + tipWidth + 'px;'
              + 'background:#1f2937;font-family:system-ui,sans-serif;'
              + 'padding:9px 11px;border-radius:8px;box-shadow:0 6px 16px rgba(0,0,0,0.4);';
            document.body.appendChild(tip);
          }
          window.addEventListener('load', place);
          window.addEventListener('resize', place);
          setTimeout(place, 50);
        })();
      <\/script>`

    return `<!doctype html><html><head><meta charset="utf-8"><style>${css || ''}</style></head><body>${html || ''}${script}</body></html>`
  }, [html, css, highlight])

  return (
    <div className="ca-preview">
      <div className="ca-browserbar">
        <div className="ca-browser-nav">
          <button type="button" aria-label="Back" disabled>‹</button>
          <button type="button" aria-label="Forward" disabled>›</button>
        </div>
        <div className="ca-browser-url">index.html</div>
        <div className="ca-browser-actions">
          <button type="button" className="ca-browser-run" onClick={onRun} title="Run" aria-label="Run">
            {outOfDate ? '●' : '▸'}
          </button>
          <span className="ca-browser-icons" aria-hidden="true">🖥 📱</span>
        </div>
      </div>
      <iframe
        className="ca-preview-iframe"
        title="Live preview of your website"
        sandbox="allow-scripts"
        srcDoc={srcDoc}
      />
    </div>
  )
}
