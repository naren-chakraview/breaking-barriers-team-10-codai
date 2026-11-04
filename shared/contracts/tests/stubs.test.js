import { runServicesContract, runRepositoryContract } from '../harness.js'
import { createStubServices } from '../stubs/services.stub.js'
import { createStubRepository } from '../stubs/repository.stub.js'

// The stubs must pass the same contract suites the real implementations will.
// This is what keeps a stub honest (ADR-014).

runServicesContract('stub', createStubServices)
runRepositoryContract('stub (in-memory)', createStubRepository)
