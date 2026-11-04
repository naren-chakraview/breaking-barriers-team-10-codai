// Health re-check / auto-resume for fallback mode (C-23, F-14.4/F-14.5).
//
// When adaptivity drops to the linear fallback path, the UI shows the "adaptive
// features temporarily unavailable" notice. C-23 says: while on fallback, re-check
// health at least every 30 s, and resume adaptive mode automatically once the
// service reports healthy again — the student should never have to reload.
//
// The polling logic lives here as a framework-free controller so it can be unit
// tested with fake timers; `useHealthRecheck` is a thin React wrapper. No `source`
// or model detail leaks in — it only ever calls `health()` and reports recovery.

import { useEffect, useRef } from 'react'
import { LIMITS } from '../../shared/contracts/seams.js'

/** C-23: re-check at least this often while on fallback. */
export const HEALTH_RECHECK_MS = LIMITS.HEALTH_RECHECK_MS // 30_000

/**
 * A HealthResponse counts as recovered when overall status is 'ok'. 'degraded' and
 * 'down' both keep us on fallback (C-23 resumes only when healthy).
 * @param {{ status?: string } | null | undefined} res
 */
export function isHealthy(res) {
  return Boolean(res) && res.status === 'ok'
}

/**
 * Create a health re-check controller. It is inert until `start()` is called, polls
 * `health()` every `intervalMs`, and fires `onRecover(res)` once (then stops) when a
 * poll comes back healthy. A failed/hung `health()` is treated as "still down": the
 * loop simply tries again on the next tick. Safe to `start()` / `stop()` repeatedly.
 *
 * @param {object} deps
 * @param {() => Promise<object>} deps.health the seam-1 health() function.
 * @param {(res: object) => void} deps.onRecover called once when health returns ok.
 * @param {number} [deps.intervalMs] poll period (defaults to C-23's 30 s).
 * @param {(res: object) => void} [deps.onPoll] optional: every poll result (for status UI/tests).
 * @param {typeof setTimeout} [deps.setTimeoutFn] injectable timer (tests use fake timers).
 * @param {typeof clearTimeout} [deps.clearTimeoutFn]
 */
export function createHealthRecheck({
  health,
  onRecover,
  intervalMs = HEALTH_RECHECK_MS,
  onPoll,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
}) {
  let timer = null
  let running = false
  // Guards an in-flight poll from a stale resolution after stop() (avoids resuming
  // adaptive mode from a response that arrived after we left fallback).
  let generation = 0

  function schedule() {
    timer = setTimeoutFn(tick, intervalMs)
  }

  async function tick() {
    const myGen = generation
    let res = null
    try {
      res = await health()
    } catch {
      res = null // a failed health check means "still down"; try again next tick.
    }
    if (!running || myGen !== generation) return // stopped (or restarted) mid-flight.
    if (onPoll) onPoll(res)
    if (isHealthy(res)) {
      stop()
      onRecover(res)
      return
    }
    schedule()
  }

  function start() {
    if (running) return
    running = true
    generation += 1
    schedule() // first re-check after one interval (we just entered fallback).
  }

  function stop() {
    running = false
    generation += 1
    if (timer != null) {
      clearTimeoutFn(timer)
      timer = null
    }
  }

  return {
    start,
    stop,
    isRunning: () => running,
  }
}

/**
 * React hook: while `active` is true, poll `health()` every `HEALTH_RECHECK_MS` and
 * call `onRecover()` when the service is healthy again (C-23). When `active` is false
 * (not on fallback) it does nothing. The controller is torn down on unmount and
 * whenever `active` flips, so there is never more than one loop running.
 *
 * @param {object} args
 * @param {boolean} args.active true while the UI is on the fallback path.
 * @param {() => Promise<object>} args.health the seam-1 health() function.
 * @param {(res: object) => void} args.onRecover
 * @param {(res: object) => void} [args.onPoll]
 * @param {number} [args.intervalMs]
 */
export function useHealthRecheck({ active, health, onRecover, onPoll, intervalMs }) {
  // Keep the latest callbacks in refs so the effect does not restart the loop when a
  // parent re-render hands us new function identities.
  const onRecoverRef = useRef(onRecover)
  const onPollRef = useRef(onPoll)
  const healthRef = useRef(health)
  onRecoverRef.current = onRecover
  onPollRef.current = onPoll
  healthRef.current = health

  useEffect(() => {
    if (!active) return undefined
    const controller = createHealthRecheck({
      health: (...a) => healthRef.current(...a),
      onRecover: (res) => onRecoverRef.current && onRecoverRef.current(res),
      onPoll: (res) => onPollRef.current && onPollRef.current(res),
      intervalMs,
    })
    controller.start()
    return () => controller.stop()
  }, [active, intervalMs])
}
