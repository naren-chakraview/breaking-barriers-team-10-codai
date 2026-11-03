# CodeAI Learning Interface — Wireframe Design

A wireframe for the CodeAI learning platform where students learn coding and AI
concepts by building a small website or app. The layout is organized into three
columns so a student can **learn, build, and get help** without leaving the
screen.

## Goals this design serves

- Students work through a **lesson** with explicit **learning objectives**.
- The platform can **measure and report on outcomes** (mastery, time, hints).
- Students **type requirements in plain language**, **ask questions**, and
  **build + deploy live** to see the project as it develops.
- An **AI tutor agent** recognizes when learning is lacking and offers
  proactive, scaffolded **hints and nudges** (guidance, not answers).

## Layout overview

### Top bar
Project name, a live **lesson-progress meter** (objectives completed), and the
key actions: **Save** and **Deploy**. Progress is always visible so students
feel momentum.

### Left column — Lesson & outcomes
- Lesson content and a **checklist of learning objectives**, with the current
  one highlighted. This is where the "measure outcomes" requirement lives.
- A **"My outcomes"** panel tracking concepts mastered, hints used, time on
  task, and a live **mastery score**. A link opens the full progress report for
  teachers/mentors.

### Center column — Requirements & code
- A **plain-language requirements box** where students type what they want to
  build ("a homepage with my name and hobbies"), plus an **Ask a question**
  button. This is the entry point for both building and asking.
- A **code editor** with tabs (Code / Files / Build log) and a **Run/Build**
  button. A status strip shows build result and the **live sandbox URL**, so
  build-and-deploy feedback is immediate.

### Right column — Live preview & AI tutor
- **Top:** a **live preview** that re-renders as the project changes, with
  web/phone toggles so students see the real project as it develops.
- **Bottom:** the **AI Tutor**. The key piece for the "recognize a lack of
  learning" requirement is the **proactive nudge bubble** — the agent detects a
  student is stuck (e.g. CSS added but not working) and offers a hint before
  being asked. Replies are **scaffolded** ("reveal step 1 of 3") rather than
  just handing over the answer, which keeps the learning intact.

## Design principles

- **Nudges are hints, not answers.** The tutor reveals guidance in steps so
  students still do the thinking. The outcomes panel counts hints used, which is
  itself a learning signal.
- **Everything is one screen.** Type → generate → run → preview → get help forms
  a tight loop, which matters for younger or first-time learners.
- **Outcomes are first-class.** Mastery and progress are visible to the student
  and exportable for reporting to CodeAI.

## Wireframe

The wireframe below is a plain SVG. View it in a markdown previewer that renders
SVG, or open the raw SVG in a browser.

```svg
<svg viewBox="0 0 1440 900" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica, Arial, sans-serif">
  <!-- page bg -->
  <rect width="1440" height="900" fill="#f4f5f7"/>

  <!-- ============ TOP BAR ============ -->
  <rect x="0" y="0" width="1440" height="56" fill="#ffffff" stroke="#d9dce1"/>
  <circle cx="28" cy="28" r="10" fill="#cfd4da"/>
  <text x="48" y="33" font-size="15" font-weight="bold" fill="#2b2f36">CodeAI</text>
  <text x="130" y="33" font-size="13" fill="#6b7280">Project: My First Website</text>

  <!-- progress in top bar -->
  <text x="520" y="26" font-size="10" fill="#6b7280">LESSON PROGRESS</text>
  <rect x="520" y="32" width="260" height="10" rx="5" fill="#e3e6ea"/>
  <rect x="520" y="32" width="150" height="10" rx="5" fill="#4f8cff"/>
  <text x="790" y="41" font-size="11" fill="#6b7280">4 / 7 objectives</text>

  <!-- top bar actions -->
  <rect x="1150" y="14" width="80" height="28" rx="6" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="1190" y="32" font-size="12" fill="#2b2f36" text-anchor="middle">Save</text>
  <rect x="1240" y="14" width="90" height="28" rx="6" fill="#22c55e"/>
  <text x="1285" y="32" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="bold">Deploy</text>
  <circle cx="1360" cy="28" r="14" fill="#cfd4da"/>
  <text x="1360" y="32" font-size="11" fill="#ffffff" text-anchor="middle">You</text>

  <!-- ============ LEFT: LESSON + OBJECTIVES ============ -->
  <rect x="16" y="72" width="300" height="812" rx="10" fill="#ffffff" stroke="#d9dce1"/>
  <text x="34" y="100" font-size="13" font-weight="bold" fill="#2b2f36">LESSON</text>
  <text x="34" y="122" font-size="14" fill="#2b2f36" font-weight="bold">Build a personal site</text>
  <text x="34" y="142" font-size="11" fill="#6b7280">Module 2 · HTML &amp; layout basics</text>

  <line x1="34" y1="158" x2="298" y2="158" stroke="#e3e6ea"/>

  <text x="34" y="184" font-size="12" font-weight="bold" fill="#2b2f36">Learning objectives</text>

  <!-- objective rows -->
  <g font-size="12" fill="#2b2f36">
    <circle cx="42" cy="208" r="7" fill="#22c55e"/>
    <text x="40" y="212" font-size="9" fill="#fff" text-anchor="middle">✓</text>
    <text x="60" y="212">Understand HTML structure</text>

    <circle cx="42" cy="236" r="7" fill="#22c55e"/>
    <text x="40" y="240" font-size="9" fill="#fff" text-anchor="middle">✓</text>
    <text x="60" y="240">Add headings &amp; text</text>

    <circle cx="42" cy="264" r="7" fill="#22c55e"/>
    <text x="40" y="268" font-size="9" fill="#fff" text-anchor="middle">✓</text>
    <text x="60" y="268">Create a list / nav</text>

    <circle cx="42" cy="292" r="7" fill="#4f8cff"/>
    <text x="60" y="296" fill="#4f8cff" font-weight="bold">Style with CSS (current)</text>

    <circle cx="42" cy="320" r="7" fill="none" stroke="#c2c7ce"/>
    <text x="60" y="324" fill="#9aa0a8">Make it responsive</text>

    <circle cx="42" cy="348" r="7" fill="none" stroke="#c2c7ce"/>
    <text x="60" y="352" fill="#9aa0a8">Add an AI feature</text>

    <circle cx="42" cy="376" r="7" fill="none" stroke="#c2c7ce"/>
    <text x="60" y="380" fill="#9aa0a8">Deploy &amp; share</text>
  </g>

  <line x1="34" y1="402" x2="298" y2="402" stroke="#e3e6ea"/>

  <!-- lesson reading content -->
  <text x="34" y="428" font-size="12" font-weight="bold" fill="#2b2f36">What you'll learn now</text>
  <rect x="34" y="440" width="264" height="150" rx="8" fill="#f7f8fa" stroke="#e3e6ea"/>
  <line x1="48" y1="464" x2="284" y2="464" stroke="#d9dce1"/>
  <line x1="48" y1="482" x2="284" y2="482" stroke="#e3e6ea"/>
  <line x1="48" y1="500" x2="260" y2="500" stroke="#e3e6ea"/>
  <line x1="48" y1="524" x2="284" y2="524" stroke="#e3e6ea"/>
  <line x1="48" y1="542" x2="230" y2="542" stroke="#e3e6ea"/>
  <rect x="48" y="558" width="120" height="20" rx="4" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="108" y="572" font-size="10" fill="#4f8cff" text-anchor="middle">code example</text>

  <!-- outcomes mini report -->
  <text x="34" y="620" font-size="12" font-weight="bold" fill="#2b2f36">My outcomes</text>
  <rect x="34" y="632" width="264" height="120" rx="8" fill="#f7f8fa" stroke="#e3e6ea"/>
  <text x="48" y="656" font-size="10" fill="#6b7280">Concepts mastered</text>
  <text x="280" y="656" font-size="11" fill="#2b2f36" text-anchor="end" font-weight="bold">3</text>
  <text x="48" y="680" font-size="10" fill="#6b7280">Hints used</text>
  <text x="280" y="680" font-size="11" fill="#2b2f36" text-anchor="end" font-weight="bold">2</text>
  <text x="48" y="704" font-size="10" fill="#6b7280">Time on task</text>
  <text x="280" y="704" font-size="11" fill="#2b2f36" text-anchor="end" font-weight="bold">24 min</text>
  <rect x="48" y="718" width="236" height="8" rx="4" fill="#e3e6ea"/>
  <rect x="48" y="718" width="160" height="8" rx="4" fill="#22c55e"/>
  <text x="48" y="744" font-size="9" fill="#9aa0a8">Mastery score · updates live</text>

  <rect x="34" y="828" width="264" height="36" rx="8" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="166" y="851" font-size="12" fill="#2b2f36" text-anchor="middle">View full progress report</text>

  <!-- ============ CENTER: REQUIREMENTS + CODE/BUILD ============ -->
  <!-- requirements box -->
  <rect x="332" y="72" width="620" height="150" rx="10" fill="#ffffff" stroke="#d9dce1"/>
  <text x="350" y="98" font-size="12" font-weight="bold" fill="#2b2f36">Describe what you want to build</text>
  <text x="350" y="116" font-size="10" fill="#6b7280">Type requirements in plain language — the AI helps you turn them into code</text>
  <rect x="350" y="126" width="584" height="56" rx="8" fill="#f7f8fa" stroke="#d9dce1"/>
  <text x="362" y="150" font-size="11" fill="#9aa0a8">e.g. "A homepage with my name, a photo, and a list of hobbies..."</text>
  <rect x="824" y="188" width="110" height="26" rx="6" fill="#4f8cff"/>
  <text x="879" y="205" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="bold">Generate / Update</text>
  <rect x="350" y="188" width="90" height="26" rx="6" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="395" y="205" font-size="11" fill="#2b2f36" text-anchor="middle">Ask a question</text>

  <!-- code / build tabs -->
  <rect x="332" y="234" width="620" height="650" rx="10" fill="#ffffff" stroke="#d9dce1"/>
  <rect x="350" y="250" width="70" height="26" rx="6" fill="#2b2f36"/>
  <text x="385" y="267" font-size="11" fill="#ffffff" text-anchor="middle">Code</text>
  <rect x="426" y="250" width="70" height="26" rx="6" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="461" y="267" font-size="11" fill="#2b2f36" text-anchor="middle">Files</text>
  <rect x="502" y="250" width="90" height="26" rx="6" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="547" y="267" font-size="11" fill="#2b2f36" text-anchor="middle">Build log</text>

  <!-- run button -->
  <rect x="842" y="250" width="92" height="26" rx="6" fill="#22c55e"/>
  <text x="888" y="267" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="bold">▶ Run / Build</text>

  <!-- code editor area -->
  <rect x="350" y="288" width="584" height="500" rx="8" fill="#1e2228"/>
  <g font-family="monospace" font-size="12" fill="#cbd3dc">
    <text x="366" y="314" fill="#5b6370">1</text><text x="392" y="314" fill="#7fd1b9">&lt;!DOCTYPE html&gt;</text>
    <text x="366" y="334" fill="#5b6370">2</text><text x="392" y="334" fill="#7fd1b9">&lt;html&gt;</text>
    <text x="366" y="354" fill="#5b6370">3</text><text x="410" y="354" fill="#7fd1b9">&lt;head&gt;</text>
    <text x="366" y="374" fill="#5b6370">4</text><text x="430" y="374" fill="#9ecbff">&lt;title&gt;</text><text x="498" y="374">My Site</text><text x="562" y="374" fill="#9ecbff">&lt;/title&gt;</text>
    <text x="366" y="394" fill="#5b6370">5</text><text x="410" y="394" fill="#7fd1b9">&lt;/head&gt;</text>
    <text x="366" y="414" fill="#5b6370">6</text><text x="410" y="414" fill="#7fd1b9">&lt;body&gt;</text>
    <text x="366" y="434" fill="#5b6370">7</text><text x="430" y="434" fill="#9ecbff">&lt;h1&gt;</text><text x="470" y="434">Hi, I'm ...</text><text x="560" y="434" fill="#9ecbff">&lt;/h1&gt;</text>
    <text x="366" y="454" fill="#5b6370">8</text><text x="430" y="454" fill="#e6a1a1">/* add your CSS here */</text>
    <text x="366" y="474" fill="#5b6370">9</text><text x="410" y="474" fill="#7fd1b9">&lt;/body&gt;</text>
  </g>
  <text x="366" y="760" font-family="monospace" font-size="11" fill="#5b6370">▌ editing · autosaved</text>

  <!-- status strip under editor -->
  <circle cx="360" cy="816" r="5" fill="#22c55e"/>
  <text x="372" y="820" font-size="11" fill="#6b7280">Build passed · deployed to sandbox</text>
  <text x="918" y="820" font-size="11" fill="#4f8cff" text-anchor="end">codeai.dev/u/you/my-site ↗</text>

  <!-- ============ RIGHT TOP: LIVE PREVIEW ============ -->
  <rect x="968" y="72" width="456" height="380" rx="10" fill="#ffffff" stroke="#d9dce1"/>
  <text x="986" y="98" font-size="12" font-weight="bold" fill="#2b2f36">Live preview</text>
  <rect x="1300" y="82" width="54" height="22" rx="5" fill="#eef1f5" stroke="#d9dce1"/>
  <text x="1327" y="97" font-size="10" fill="#2b2f36" text-anchor="middle">▢ phone</text>
  <rect x="1362" y="82" width="46" height="22" rx="5" fill="#2b2f36"/>
  <text x="1385" y="97" font-size="10" fill="#ffffff" text-anchor="middle">web</text>

  <!-- browser chrome -->
  <rect x="986" y="112" width="420" height="326" rx="6" fill="#f7f8fa" stroke="#d9dce1"/>
  <rect x="986" y="112" width="420" height="24" rx="6" fill="#eef1f5"/>
  <circle cx="1000" cy="124" r="3" fill="#ff6058"/><circle cx="1012" cy="124" r="3" fill="#ffbd2e"/><circle cx="1024" cy="124" r="3" fill="#28c840"/>
  <rect x="1040" y="118" width="356" height="12" rx="6" fill="#ffffff" stroke="#d9dce1"/>
  <!-- rendered page mock -->
  <rect x="1000" y="150" width="392" height="40" rx="4" fill="#4f8cff"/>
  <text x="1016" y="175" font-size="13" fill="#ffffff" font-weight="bold">Hi, I'm Alex 👋</text>
  <circle cx="1040" cy="230" r="24" fill="#d9dce1"/>
  <rect x="1080" y="212" width="180" height="10" rx="5" fill="#d9dce1"/>
  <rect x="1080" y="230" width="230" height="10" rx="5" fill="#e3e6ea"/>
  <rect x="1080" y="248" width="140" height="10" rx="5" fill="#e3e6ea"/>
  <rect x="1000" y="285" width="392" height="1" fill="#e3e6ea"/>
  <text x="1000" y="310" font-size="11" fill="#6b7280">My hobbies</text>
  <rect x="1000" y="320" width="110" height="60" rx="6" fill="#eef1f5" stroke="#e3e6ea"/>
  <rect x="1140" y="320" width="110" height="60" rx="6" fill="#eef1f5" stroke="#e3e6ea"/>
  <rect x="1280" y="320" width="110" height="60" rx="6" fill="#eef1f5" stroke="#e3e6ea"/>

  <!-- ============ RIGHT BOTTOM: AI TUTOR / CHAT ============ -->
  <rect x="968" y="468" width="456" height="416" rx="10" fill="#ffffff" stroke="#d9dce1"/>
  <circle cx="988" cy="492" r="8" fill="#7c5cff"/>
  <text x="1004" y="497" font-size="12" font-weight="bold" fill="#2b2f36">AI Tutor</text>
  <rect x="1290" y="482" width="118" height="22" rx="11" fill="#fff4e0" stroke="#f5c876"/>
  <text x="1349" y="497" font-size="10" fill="#b8860b" text-anchor="middle">💡 nudge available</text>

  <!-- proactive nudge bubble -->
  <rect x="986" y="516" width="380" height="74" rx="10" fill="#fff8ec" stroke="#f5c876"/>
  <text x="1002" y="538" font-size="11" fill="#8a6d1f" font-weight="bold">I noticed you're stuck on styling 🤔</text>
  <text x="1002" y="556" font-size="11" fill="#6b7280">You added CSS but colors aren't showing.</text>
  <text x="1002" y="574" font-size="11" fill="#6b7280">Want a hint about where the style tag goes?</text>
  <rect x="1270" y="560" width="80" height="22" rx="6" fill="#4f8cff"/>
  <text x="1310" y="575" font-size="10" fill="#ffffff" text-anchor="middle">Show hint</text>

  <!-- student question -->
  <rect x="1106" y="604" width="260" height="40" rx="10" fill="#eef1f5"/>
  <text x="1122" y="628" font-size="11" fill="#2b2f36">How do I make the heading blue?</text>

  <!-- tutor reply -->
  <rect x="986" y="652" width="300" height="78" rx="10" fill="#f3f0ff"/>
  <text x="1002" y="674" font-size="11" fill="#2b2f36">Great question! Instead of the answer,</text>
  <text x="1002" y="692" font-size="11" fill="#2b2f36">try: which property sets text color?</text>
  <text x="1002" y="710" font-size="11" fill="#7c5cff" font-weight="bold">Reveal step 1 of 3 →</text>

  <!-- chat input -->
  <rect x="986" y="844" width="330" height="28" rx="14" fill="#f7f8fa" stroke="#d9dce1"/>
  <text x="1002" y="862" font-size="11" fill="#9aa0a8">Ask the tutor anything...</text>
  <rect x="1326" y="844" width="80" height="28" rx="14" fill="#7c5cff"/>
  <text x="1366" y="862" font-size="11" fill="#ffffff" text-anchor="middle" font-weight="bold">Send</text>
</svg>
```

## Component reference

| Region | Component | Purpose |
| --- | --- | --- |
| Top bar | Progress meter | Shows objectives completed; keeps momentum visible |
| Top bar | Save / Deploy | One-click persistence and live deployment |
| Left | Objectives checklist | Tracks learning objectives, highlights current |
| Left | My outcomes panel | Mastery score, hints used, time on task; exportable report |
| Center | Requirements box | Plain-language input to generate/update the project |
| Center | Ask a question | Routes a question to the AI tutor |
| Center | Code editor + tabs | Code / Files / Build log |
| Center | Run / Build | Triggers build and sandbox deploy |
| Center | Status strip | Build result + live sandbox URL |
| Right top | Live preview | Re-renders on change; web/phone toggle |
| Right bottom | Proactive nudge | Agent detects stuck state and offers a hint |
| Right bottom | Scaffolded reply | Step-by-step guidance instead of direct answers |
| Right bottom | Chat input | Free-form questions to the tutor |

## Possible next steps

- A clickable HTML mock for a hackathon demo.
- A teacher/admin dashboard wireframe for the reporting side.
- A student onboarding / lesson-select screen.
- A mobile layout version.
