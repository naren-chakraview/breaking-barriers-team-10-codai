import { runServicesContract } from '../../shared/contracts/harness.js'
import { tree, clone } from '../../shared/contracts/fixtures/index.js'
import { createServices } from './services.js'
import { createJsonRepository } from '../store/json-repository.js'
import { makeCoreDouble, makeModelDouble } from './test-doubles.js'

// Track D's real services implementation must pass the SAME seam-1 suite the stub passes
// (ADR-014). The core (Track B) and model/safety (Track C) seams are provided as doubles
// here; the real wiring injects shared/core and the Seam-3 implementations.
//
// The harness calls each function with a single args object (no ctx), so createServices
// defaults the student context to a demo student. We seed one student so the roster has a row.

function makeServices() {
  const repo = createJsonRepository()
  // Seed a student so getTeacherRoster returns a schema-valid row, and so setTeacherInput
  // (called with stu-slow) has somewhere to write.
  repo.putStudent({ studentId: 'stu-slow', displayName: 'Steady Sam', synthetic: true })
  repo.putStudent({ studentId: 'demo-student', displayName: 'Demo', synthetic: true })

  return createServices({
    core: makeCoreDouble(),
    model: makeModelDouble(),
    repo,
    tree: clone(tree),
    modes: { serviceMode: 'http', modelMode: 'stub', storeMode: 'json' },
  })
}

runServicesContract('http (track D, stubbed seams)', makeServices)
