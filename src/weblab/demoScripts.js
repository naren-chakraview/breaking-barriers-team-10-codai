// Scripted walkthroughs for the "Play demo" button. Each scenario drives the
// REAL lesson UI (typing, Run, Get a hint, Submit) through the driver `d`, so
// the viewer watches the actual adaptive engine react, not a recording.
// Personas follow shared/contracts/fixtures/personas (slow and quick).

const ROUTE_WHY = {
  support: 'Missed it, so the lesson offers an easier version of the SAME skill, with a skeleton to fill in.',
  retry: 'Still not there, so the same step comes back with the same help. The score is never lowered.',
  advance: 'Passed, so on to the next skill at the standard pace.',
  stretch: 'Full marks with no hints, so a deeper version of the next skill (depth, not more volume).',
}

async function afterSubmit(d) {
  await d.waitFor((l) => l.phase === 'working' || l.phase === 'complete', 'the next step')
  const r = d.live().lastRoute
  return r
}

const STEADY = {
  id: 'steady',
  name: 'Steady Sam',
  tagline: 'New to HTML and needs more time',
  blurb:
    'Sam misses the first try, asks for hints, and misses again. Watch the lesson slow down: an easier version, a teacher flag, and a different way of explaining. The score never drops.',
  async play(d) {
    await d.say('Meet Sam. Sam is new to HTML and starts on the standard step: add a heading and a paragraph.', { title: 'Steady Sam' })

    await d.say('Sam types a heading and a paragraph, but forgets the closing tags.')
    await d.type('index.html', '<h1>Sam\n<p>I like art\n')
    await d.say('Run checks the code and explains the problem in plain words. Nothing is lost.')
    await d.run()
    await d.showLog()
    await d.say('The build log names the exact line. Sam is still unsure, so Sam submits anyway.')
    await d.submit()
    let r = await afterSubmit(d)
    await d.say(`Miss number 1. ${ROUTE_WHY[r?.reason] || ''} Check the Pace box below: it now reads "Slower, extra help".`, { title: 'The lesson adapts' })

    await d.say('On the easier step, Sam asks the tutor for help before touching anything.')
    await d.ask('I am stuck. How do I close the p tag?')
    await d.say('The tutor answers the question AND opens a hint. Hint step 1 gives the idea, and the arrow shows where to look.', { title: 'Asking for a hint' })
    await d.say('Sam is not ready to use it yet and removes a closing tag by mistake.')
    await d.type('index.html', '<h1>Sam</h1>\n<p>I like art\n')
    await d.submit()
    r = await afterSubmit(d)
    await d.say(`Miss number 2 in a row. ${ROUTE_WHY[r?.reason] || ''} A remediation flag is raised for the teacher, and the next help is a worked example instead of the same explanation again.`, { title: 'Teacher flag raised' })

    await d.say('The step restarts with the skeleton. Hint step 1 is still open from the question. Sam asks for step 2: more detail, with the exact line highlighted in the editor.')
    await d.hint()
    await d.say('Step 3: the worked example, plus an arrow on the live preview showing the result. Each rung gives more help only when asked.', { title: 'The hint ladder' })
    await d.hint()
    await d.type('index.html', '<h1>Sam</h1>\n<p>I like art.</p>\n')
    await d.run()
    await d.say('The build passes. Sam submits.')
    await d.submit()
    r = await afterSubmit(d)
    await d.say(`Sam passes, but needed hints and an easier step. ${ROUTE_WHY[r?.reason] || ''} No stretch for now: the lesson stays at the standard pace.`, { title: 'Steady progress' })

    await d.say('On the colors step, Sam asks a question first. The tutor looks at Sam\'s actual code before answering.')
    await d.ask('How do I change the background color?')
    await d.say('Sam types the CSS using the example from the hint.')
    await d.type(
      'styles.css',
      'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n  background: #f0f9ff;\n}\n\nh1 {\n  color: navy;\n}\n',
    )
    await d.run()
    await d.submit()
    r = await afterSubmit(d)
    await d.say(`Sam passes the colors step. ${ROUTE_WHY[r?.reason] || ''}`, { title: 'Moving on' })
    await d.say('Summary: more tries, more hints and a slower route, but Sam keeps the same goals as everyone. The teacher sees the flag and can step in.', { title: 'Steady Sam: done', hold: true })
  },
}

const QUICK = {
  id: 'quick',
  name: 'Quick Quinn',
  tagline: 'Already knows the basics',
  blurb:
    'Quinn gets it right on the first try without hints. Watch the lesson speed up: a deeper challenge instead of more of the same, and fewer steps to reach the end.',
  async play(d) {
    await d.say('Meet Quinn. Quinn has built web pages before and starts on the same first step as everyone.', { title: 'Quick Quinn' })
    await d.say('Quinn writes both tags correctly straight away and asks for no hints.')
    await d.type('index.html', '<h1>Quinn</h1>\n<p>I like building robots.</p>\n')
    await d.run()
    await d.say('The build passes. Quinn submits.')
    await d.submit()
    let r = await afterSubmit(d)
    await d.say(`Full marks, no hints. ${ROUTE_WHY[r?.reason] || ''} The Pace box below now reads "Deeper challenge".`, { title: 'The lesson adapts' })

    await d.say('This tougher step asks for readable colors with good contrast and one accent. Quinn works on it without help.')
    await d.type(
      'styles.css',
      'body {\n  font-family: system-ui, sans-serif;\n  padding: 24px;\n  background: #ffffff;\n  color: #1f2937;\n}\n\np {\n  border-left: 4px solid #4f46e5;\n  padding-left: 8px;\n}\n',
    )
    await d.run()
    await d.submit()
    r = await afterSubmit(d)
    await d.say(`Another clean pass. ${ROUTE_WHY[r?.reason] || ''} Quinn covered two skills in the time Sam spent on one.`, { title: 'Fast, not skipped' })

    await d.say('Next is layout. Quinn centers the page and adds a readable width.')
    await d.type(
      'styles.css',
      'body {\n  font-family: system-ui, sans-serif;\n  background: #ffffff;\n  color: #1f2937;\n  max-width: 600px;\n  margin: 0 auto;\n  padding: 32px;\n}\n\np {\n  border-left: 4px solid #4f46e5;\n  padding-left: 8px;\n}\n',
    )
    await d.run()
    await d.submit()
    r = await afterSubmit(d)
    await d.say(`Passed again. ${ROUTE_WHY[r?.reason] || ''}`, { title: 'Moving on' })
    await d.say('Summary: same goals as Sam, reached with fewer steps and no hints. Quinn gets more depth, not more volume, and the tutor stays quiet unless asked.', { title: 'Quick Quinn: done', hold: true })
  },
}

export const SCENARIOS = [STEADY, QUICK]
export { ROUTE_WHY }
