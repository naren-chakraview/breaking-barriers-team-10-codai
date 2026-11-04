import { runServicesContract } from '../../shared/contracts/harness.js'
import { createServices } from './provider.js'

// Prove the new provider satisfies the SAME seam-1 contract suite the stub passes
// (ADR-014). Constructed in mock mode with an explicit env so the test never
// depends on import.meta.env (which is undefined under the Node test environment).
// When the real HTTP client lands, point this at VITE_SERVICE_MODE='http' too.

runServicesContract('provider (mock)', () => createServices({ VITE_SERVICE_MODE: 'mock' }))
