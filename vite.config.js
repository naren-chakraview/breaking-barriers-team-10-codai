import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This app is reached through a CloudFront proxy mounted at `/proxy/5173/`.
// The proxy STRIPS that prefix before forwarding, so Vite receives `/...`,
// but the browser's page URL still carries the prefix, so every URL the
// browser requests must start with `/proxy/5173/` to be routed back to Vite.
//
// `vite preview` already works: its built assets are referenced relatively
// (`./assets/...`), so the browser resolves them under the proxied page path.
//
// `vite dev` is the hard case. It injects ABSOLUTE URLs (`/@vite/client`,
// `/src/main.jsx`) that ignore a relative base, so dev needs an absolute
// `base: '/proxy/5173/'` to keep those inside the proxied prefix. But with
// that base, Vite 302-redirects the stripped `/` to `/proxy/5173/`, and the
// browser compounds it onto the existing prefix -> `/proxy/5173/proxy/5173/`.
//
// Fix: set the prefixed base so asset URLs are correct, and add a dev-only
// middleware that re-adds the stripped prefix to incoming requests. Vite then
// always sees `/proxy/5173/...`, serves the app and assets, and never issues
// the base-mismatch redirect that caused the doubled URL.
const PROXY_BASE = process.env.VITE_PROXY_BASE // e.g. "/proxy/5173/"

function stripProxyPrefix() {
  // The base without the trailing slash, e.g. "/proxy/5173".
  const prefix = PROXY_BASE.replace(/\/$/, '')
  return {
    name: 'readd-stripped-proxy-prefix',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // The proxy forwards paths with the prefix removed. Re-add it so the
        // request matches `base` and Vite does not redirect.
        if (req.url && !req.url.startsWith(prefix + '/') && req.url !== prefix) {
          req.url = prefix + (req.url.startsWith('/') ? req.url : '/' + req.url)
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: PROXY_BASE || './',
  plugins: [react(), ...(PROXY_BASE ? [stripProxyPrefix()] : [])],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    // Behind the HTTPS proxy, route the HMR websocket back through CloudFront
    // (443/wss). Vite derives the socket path from `base`.
    ...(PROXY_BASE ? { hmr: { clientPort: 443, protocol: 'wss' } } : {}),
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
})
