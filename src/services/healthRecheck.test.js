import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHealthRecheck, isHealthy, HEALTH_RECHECK_MS } from './healthRecheck.js'

// A deferred promise so a test can resolve a specific health() call on demand.
function deferred() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

const OK = { status: 'ok', components: {} }
const DOWN = { status: 'down', components: {} }
const DEGRADED = { status: 'degraded', components: {} }

describe('isHealthy', () => {
  it('is true only for status ok', () => {
    expect(isHealthy(OK)).toBe(true)
    expect(isHealthy(DOWN)).toBe(false)
    expect(isHealthy(DEGRADED)).toBe(false)
    expect(isHealthy(null)).toBe(false)
    expect(isHealthy(undefined)).toBe(false)
  })
})

describe('createHealthRecheck', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('defaults to the C-23 re-check interval (30 s)', () => {
    expect(HEALTH_RECHECK_MS).toBe(30_000)
  })

  it('polls after one interval and keeps polling while down', async () => {
    const health = vi.fn().mockResolvedValue(DOWN)
    const onRecover = vi.fn()
    const rc = createHealthRecheck({ health, onRecover, intervalMs: 1000 })

    rc.start()
    expect(health).not.toHaveBeenCalled() // first check is after one interval, not immediately

    await vi.advanceTimersByTimeAsync(1000)
    expect(health).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(health).toHaveBeenCalledTimes(2)
    expect(onRecover).not.toHaveBeenCalled()
    expect(rc.isRunning()).toBe(true)

    rc.stop()
  })

  it('resumes (fires onRecover once) and stops when health returns ok', async () => {
    const health = vi.fn()
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValueOnce(OK)
      .mockResolvedValue(OK)
    const onRecover = vi.fn()
    const rc = createHealthRecheck({ health, onRecover, intervalMs: 1000 })

    rc.start()
    await vi.advanceTimersByTimeAsync(1000) // down
    expect(onRecover).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000) // ok -> recover
    expect(onRecover).toHaveBeenCalledTimes(1)
    expect(rc.isRunning()).toBe(false)

    // No further polling after recovery.
    const callsAtRecovery = health.mock.calls.length
    await vi.advanceTimersByTimeAsync(5000)
    expect(health.mock.calls.length).toBe(callsAtRecovery)
  })

  it('treats a failed/hung health() as still-down and tries again', async () => {
    const health = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(OK)
    const onRecover = vi.fn()
    const rc = createHealthRecheck({ health, onRecover, intervalMs: 1000 })

    rc.start()
    await vi.advanceTimersByTimeAsync(1000) // throws -> still down
    expect(onRecover).not.toHaveBeenCalled()
    expect(rc.isRunning()).toBe(true)
    await vi.advanceTimersByTimeAsync(1000) // ok -> recover
    expect(onRecover).toHaveBeenCalledTimes(1)
  })

  it('stop() prevents an in-flight ok from recovering after we leave fallback', async () => {
    const d = deferred()
    const health = vi.fn().mockReturnValueOnce(d.promise)
    const onRecover = vi.fn()
    const rc = createHealthRecheck({ health, onRecover, intervalMs: 1000 })

    rc.start()
    await vi.advanceTimersByTimeAsync(1000) // health() called, promise pending
    expect(health).toHaveBeenCalledTimes(1)

    rc.stop()                 // we left fallback before the poll resolved
    d.resolve(OK)             // the stale call now resolves healthy
    await Promise.resolve()   // let the awaited resolution run
    expect(onRecover).not.toHaveBeenCalled()
  })

  it('start() is idempotent (never two loops at once)', async () => {
    const health = vi.fn().mockResolvedValue(DOWN)
    const rc = createHealthRecheck({ health, onRecover: vi.fn(), intervalMs: 1000 })
    rc.start()
    rc.start()
    await vi.advanceTimersByTimeAsync(1000)
    expect(health).toHaveBeenCalledTimes(1) // one loop, one poll per interval
    rc.stop()
  })
})
