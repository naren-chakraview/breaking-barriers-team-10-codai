// Inline SVG art for the View course page. Everything here is decorative and
// aria-hidden; the meaning is always carried by real text elsewhere on the page.

const ICONS = {
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  lifebuoy: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" /><line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" /></>,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
  chat: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />,
  check: <polyline points="20 6 9 17 4 12" />,
  checkcircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  play: <polygon points="6 3 20 12 6 21 6 3" />,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  drop: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  layout: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></>,
  star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
  award: <><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></>,
  flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>,
  arrow: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  pin: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  undo: <><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></>,
}

export function Icon({ name, size = 18, strokeWidth = 2 }) {
  return (
    <svg
      className="cv-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}

// Hero scene: a page being built, the code behind it, and a tutor nudge.
export function HeroArt() {
  return (
    <svg className="cv-heroart" viewBox="0 0 470 350" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ha-banner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f8cff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="ha-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#0b1030" floodOpacity="0.35" />
        </filter>
      </defs>

      <rect x="86" y="44" width="300" height="214" rx="18" fill="rgba(255,255,255,0.14)" transform="rotate(-5 236 151)" />

      <g filter="url(#ha-shadow)">
        <rect x="34" y="62" width="336" height="236" rx="16" fill="#fff" />
        <path d="M34 78a16 16 0 0 1 16-16h304a16 16 0 0 1 16 16v14H34z" fill="#eef1f5" />
        <circle cx="54" cy="77" r="4.5" fill="#ff6058" /><circle cx="68" cy="77" r="4.5" fill="#ffbd2e" /><circle cx="82" cy="77" r="4.5" fill="#28c840" />
        <rect x="104" y="70" width="190" height="14" rx="7" fill="#fff" stroke="#d9dce1" />

        <rect x="52" y="108" width="300" height="62" rx="10" fill="url(#ha-banner)" />
        <circle cx="86" cy="139" r="17" fill="#fff" opacity="0.92" />
        <rect x="116" y="124" width="140" height="11" rx="5.5" fill="#fff" />
        <rect x="116" y="143" width="96" height="8" rx="4" fill="#fff" opacity="0.65" />

        <rect x="52" y="186" width="262" height="8" rx="4" fill="#e3e6ea" />
        <rect x="52" y="202" width="224" height="8" rx="4" fill="#e3e6ea" />
        <rect x="52" y="218" width="246" height="8" rx="4" fill="#e3e6ea" />
        <rect x="52" y="240" width="64" height="22" rx="11" fill="#e8f0ff" />
        <rect x="124" y="240" width="64" height="22" rx="11" fill="#dff3e6" />
        <rect x="196" y="240" width="64" height="22" rx="11" fill="#fff4e0" />
      </g>

      <g filter="url(#ha-shadow)">
        <rect x="236" y="196" width="214" height="118" rx="14" fill="#0f172a" />
        <circle cx="254" cy="212" r="3.5" fill="#ff6058" /><circle cx="266" cy="212" r="3.5" fill="#ffbd2e" /><circle cx="278" cy="212" r="3.5" fill="#28c840" />
        <g fontFamily="ui-monospace, Consolas, monospace" fontSize="11.5">
          <text x="254" y="238"><tspan fill="#9ecbff">&lt;h1&gt;</tspan><tspan fill="#e5e7eb">Hi, I'm Alex</tspan><tspan fill="#9ecbff">&lt;/h1&gt;</tspan></text>
          <text x="254" y="258"><tspan fill="#f9a8d4">h1</tspan><tspan fill="#e5e7eb"> {'{'} </tspan><tspan fill="#7fd1b9">color</tspan><tspan fill="#e5e7eb">: </tspan><tspan fill="#fbbf24">navy</tspan><tspan fill="#e5e7eb">; {'}'}</tspan></text>
          <text x="254" y="278"><tspan fill="#9ecbff">&lt;p&gt;</tspan><tspan fill="#e5e7eb">I like soccer</tspan><tspan fill="#9ecbff">&lt;/p&gt;</tspan></text>
        </g>
        <rect x="254" y="288" width="9" height="13" rx="1.5" fill="#4f8cff" />
      </g>

      <g filter="url(#ha-shadow)">
        <path d="M312 22h116a14 14 0 0 1 14 14v34a14 14 0 0 1-14 14h-78l-18 16v-16h-20a14 14 0 0 1-14-14V36a14 14 0 0 1 14-14z" fill="#6d4bd8" />
        <circle cx="332" cy="53" r="9" fill="#fff" /><circle cx="332" cy="53" r="4" fill="#6d4bd8" />
        <text x="350" y="50" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="700" fill="#fff">Try adding</text>
        <text x="350" y="66" fontFamily="system-ui, sans-serif" fontSize="12" fontWeight="700" fill="#fff">an h1 first!</text>
      </g>

      <g fontFamily="ui-monospace, Consolas, monospace" fontWeight="700">
        <circle cx="30" cy="122" r="19" fill="#22c55e" /><text x="30" y="127" textAnchor="middle" fontSize="13" fill="#fff">&lt;/&gt;</text>
        <circle cx="448" cy="168" r="17" fill="#f5b942" /><text x="448" y="173" textAnchor="middle" fontSize="13" fill="#3b2a05">{'{ }'}</text>
      </g>
      <g fill="#fff">
        <path d="M410 120l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" opacity="0.9" />
        <path d="M62 322l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" opacity="0.7" />
        <path d="M200 20l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2z" opacity="0.7" />
      </g>
    </svg>
  )
}

// "What you'll build": the finished site, with callouts to the skills behind it.
export function SiteArt() {
  return (
    <svg className="cv-siteart" viewBox="0 0 420 300" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sa-head" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0f766e" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <filter id="sa-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>
      <g filter="url(#sa-shadow)">
        <rect x="20" y="14" width="380" height="266" rx="16" fill="#fff" stroke="#d9dce1" />
        <path d="M20 30a16 16 0 0 1 16-16h348a16 16 0 0 1 16 16v14H20z" fill="#eef1f5" />
        <circle cx="40" cy="29" r="4.5" fill="#ff6058" /><circle cx="54" cy="29" r="4.5" fill="#ffbd2e" /><circle cx="68" cy="29" r="4.5" fill="#28c840" />
        <rect x="90" y="22" width="220" height="14" rx="7" fill="#fff" stroke="#d9dce1" />
        <rect x="20" y="44" width="380" height="64" fill="url(#sa-head)" />
        <circle cx="110" cy="76" r="20" fill="#fff" opacity="0.95" />
        <rect x="142" y="62" width="150" height="12" rx="6" fill="#fff" />
        <rect x="142" y="82" width="104" height="8" rx="4" fill="#fff" opacity="0.7" />
        <rect x="100" y="128" width="220" height="9" rx="4.5" fill="#d9dce1" />
        <rect x="100" y="146" width="196" height="9" rx="4.5" fill="#e3e6ea" />
        <rect x="100" y="164" width="212" height="9" rx="4.5" fill="#e3e6ea" />
        <rect x="100" y="196" width="66" height="24" rx="12" fill="#e8f0ff" /><rect x="174" y="196" width="66" height="24" rx="12" fill="#dff3e6" /><rect x="248" y="196" width="66" height="24" rx="12" fill="#fff4e0" />
        <rect x="100" y="238" width="214" height="22" rx="8" fill="#f3f0ff" />
      </g>
      <g fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700">
        <rect x="288" y="52" width="104" height="26" rx="13" fill="#2563eb" /><text x="340" y="69" textAnchor="middle" fill="#fff">1 · Structure</text>
        <rect x="8" y="118" width="84" height="26" rx="13" fill="#7c3aed" /><text x="50" y="135" textAnchor="middle" fill="#fff">2 · Style</text>
        <rect x="318" y="150" width="92" height="26" rx="13" fill="#0f766e" /><text x="364" y="167" textAnchor="middle" fill="#fff">3 · Layout</text>
        <rect x="318" y="232" width="92" height="26" rx="13" fill="#be123c" /><text x="364" y="249" textAnchor="middle" fill="#fff">4 · Polish</text>
      </g>
    </svg>
  )
}
