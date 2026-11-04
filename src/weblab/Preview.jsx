import { useMemo } from 'react'

// Right-top card from the wireframe: "Live preview" with a phone/web toggle,
// browser chrome (traffic lights + URL bar) and the rendered page. The iframe
// runs with allow-scripts so we can inject a small highlighter that rings a
// target element and shows a structured comment (title / body / code). The
// injected script is our own; the page content is the student's HTML/CSS.
export default function Preview({
  html, css, device, onDeviceChange, outOfDate, hasOutput, highlight, url,
}) {
  const srcDoc = useMemo(() => {
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
              + 'border:2px dashed #f59e0b;border-radius:6px;';
            document.body.appendChild(ring);

            var tip = document.createElement('div');
            tip.setAttribute('data-wl-hl', '1');
            var inner = '';
            if (H.title) inner += '<div style="font-weight:800;color:#fbbf24;font-size:12px;margin-bottom:3px;">\\uD83D\\uDC49 ' + esc(H.title) + '</div>';
            if (H.body)  inner += '<div style="font-size:12px;line-height:1.45;color:#f3f4f6;">' + esc(H.body) + '</div>';
            if (H.code)  inner += '<pre style="margin:7px 0 0;padding:6px 8px;background:#0b1220;color:#e5e7eb;border-radius:6px;font:11px/1.5 ui-monospace,Consolas,monospace;white-space:pre;overflow-x:auto;">' + esc(H.code) + '</pre>';
            tip.innerHTML = inner;

            var tipWidth = Math.min(300, Math.max(160, window.innerWidth - 16));
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
    <section className="wf-card wf-preview" aria-label="Live preview">
      <div className="wf-card-head">
        <h2 className="wf-card-title">Live preview</h2>
        <div className="wf-seg" role="group" aria-label="Preview size">
          <button
            type="button"
            className={`wf-seg-btn ${device === 'phone' ? 'is-active' : ''}`}
            aria-pressed={device === 'phone'}
            onClick={() => onDeviceChange('phone')}
          >
            ▢ phone
          </button>
          <button
            type="button"
            className={`wf-seg-btn ${device === 'web' ? 'is-active' : ''}`}
            aria-pressed={device === 'web'}
            onClick={() => onDeviceChange('web')}
          >
            web
          </button>
        </div>
      </div>

      <div className="wf-browser">
        <div className="wf-browser-bar">
          <span className="wf-dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="wf-browser-url">{url}</span>
          {outOfDate && hasOutput && <span className="wf-stale" role="status">out of date</span>}
        </div>
        <div className={`wf-browser-body wf-browser-body--${device}`}>
          {hasOutput ? (
            <iframe
              className="wf-browser-frame"
              title="Live preview of your website"
              sandbox="allow-scripts"
              srcDoc={srcDoc}
            />
          ) : (
            <div className="wf-empty">
              <p className="wf-empty-title">Nothing to preview yet</p>
              <p className="wf-empty-sub">Describe your page above, or write some code and press <strong>▶ Run / Build</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
