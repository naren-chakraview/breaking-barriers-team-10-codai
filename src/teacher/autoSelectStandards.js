// Auto-select CSTA High School Specialty standards for a student when the teacher
// has NOT chosen any. Picks from the same 24 AI + 27 Cybersecurity list the
// teacher picks from, using the student's interests (questionnaire) and their
// skill-check tier to decide the mix and difficulty. Deterministic given the same
// inputs. Local/mocked heuristic — this is the seam where a model-driven
// recommendation would plug in later.
import { allStandards } from './cstaStandards.js'

// Parse the identifier: S1/S2 = Specialty I/II (difficulty), AIN/CYB = area.
function parse(code) {
  const m = /^S(\d)-(AIN|CYB)-([A-Z]+)-(\d+)$/.exec(code)
  return m ? { spec: Number(m[1]), area: m[2], sub: m[3] } : null
}

// Which area to lean toward, from the interest topic. Both areas always appear;
// this just shifts the balance. Cybersecurity leans for privacy/safety/tech-risk
// interests; AI leans for build/create/data interests. Default is an even split.
function areaLean(profile) {
  const topic = profile?.answers?.topic
  const aiLean = new Set(['coding', 'science', 'art', 'photography', 'music', 'gaming', 'business'])
  const cyberLean = new Set(['cause', 'club', 'me'])
  if (aiLean.has(topic)) return { AIN: 0.65, CYB: 0.35 }
  if (cyberLean.has(topic)) return { AIN: 0.4, CYB: 0.6 }
  return { AIN: 0.5, CYB: 0.5 }
}

/**
 * Choose standards for a student with no teacher assignment.
 * @param {object} opts
 * @param {object} [opts.profile]   interests profile (buildProfile output)
 * @param {'support'|'core'|'stretch'} [opts.tier]  skill-check starting tier
 * @param {number} [opts.count]     how many standards to pick (default 8)
 * @returns {Array} selected standards, intro-first, with { code, statement, areaId, areaLabel }
 */
export function autoSelectStandards({ profile = null, tier = 'core', count = 8 } = {}) {
  const all = allStandards().map((s) => ({ ...s, ...parse(s.code) })).filter((s) => s.spec)

  // Difficulty: everyone gets Specialty I (intro) foundations; a 'stretch' student
  // also gets some Specialty II (advanced). 'support' stays entirely on intro.
  const allowAdvanced = tier === 'stretch'
  const pool = all.filter((s) => (allowAdvanced ? true : s.spec === 1))

  // Order within an area: intro (S1) before advanced (S2), then by code so it is
  // a sensible learning progression and fully deterministic.
  const ordered = (area) =>
    pool.filter((s) => s.area === area).sort((a, b) => (a.spec - b.spec) || a.code.localeCompare(b.code))

  const lean = areaLean(profile)
  const aiN = Math.max(1, Math.round(count * lean.AIN))
  const cyN = Math.max(1, count - aiN)

  const picked = [...ordered('AIN').slice(0, aiN), ...ordered('CYB').slice(0, cyN)]
  // Keep a stable, readable order: all AI first (intro->advanced), then all Cyber.
  return picked
    .sort((a, b) => (a.area === b.area ? (a.spec - b.spec) || a.code.localeCompare(b.code) : a.area === 'AIN' ? -1 : 1))
    .map(({ code, statement, areaId, areaLabel }) => ({ code, statement, areaId, areaLabel }))
}
