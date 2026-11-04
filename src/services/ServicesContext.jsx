import { createContext, useContext, useMemo } from 'react'
import { createServices } from './provider.js'

// React context for the seam-1 services object, so components get their data
// source (getTree, submitStep, askTutor, ...) without prop-drilling. The provider
// chooses mock vs http once (via VITE_SERVICE_MODE) and shares the same object
// with every descendant.

const ServicesContext = createContext(null)

/**
 * Supplies a Services object to its descendants.
 * @param {object} props
 * @param {import('./types.js').Services} [props.services] inject a ready object (tests/stories).
 * @param {Record<string, string | undefined>} [props.env] env override for createServices.
 * @param {React.ReactNode} props.children
 */
export function ServicesProvider({ services, env, children }) {
  // Build once from the active mode unless an explicit object was injected.
  const built = useMemo(() => services ?? createServices(env), [services, env])
  return <ServicesContext.Provider value={built}>{children}</ServicesContext.Provider>
}

/**
 * Read the Services object from the nearest ServicesProvider.
 * @returns {import('./types.js').Services}
 */
export function useServices() {
  const value = useContext(ServicesContext)
  if (!value) {
    throw new Error('useServices must be used within a <ServicesProvider>.')
  }
  return value
}
