import { describe, expect, it } from 'vitest'
import { DEAD_MS, EARLIEST_SPAWN_MS, LATEST_SPAWN_MS, STALE_OVERDUE_MS } from '@/lib/game'
import { formatDuration, formatElapsed, spawnSnapshot } from '@/lib/timers'

const KILL = Date.parse('2026-09-09T12:00:00.000Z')

describe('spawnSnapshot', () => {
  it('treats a missing kill as unknown', () => {
    expect(spawnSnapshot(null, KILL).status).toBe('unknown')
  })

  it('stays dead through the 60-minute lock', () => {
    const justBeforeWindow = spawnSnapshot(KILL, KILL + EARLIEST_SPAWN_MS - 1)
    expect(justBeforeWindow.status).toBe('dead')
    expect(justBeforeWindow.msUntilWindow).toBe(1)
    expect(spawnSnapshot(KILL, KILL + DEAD_MS).status).toBe('dead')
  })

  it('opens the spawn window at 60 minutes + 1 second', () => {
    const atWindow = spawnSnapshot(KILL, KILL + EARLIEST_SPAWN_MS)
    expect(atWindow.status).toBe('window')
    expect(atWindow.msUntilWindow).toBe(0)
    expect(atWindow.msWindowOpen).toBe(0)
    expect(atWindow.msLeftInWindow).toBe(LATEST_SPAWN_MS - EARLIEST_SPAWN_MS)
  })

  it('counts how long the spawn window has been open', () => {
    const openFor = spawnSnapshot(KILL, KILL + EARLIEST_SPAWN_MS + 90_000)
    expect(openFor.status).toBe('window')
    expect(openFor.msWindowOpen).toBe(90_000)
  })

  it('stays in window until the 90-minute mark', () => {
    expect(spawnSnapshot(KILL, KILL + LATEST_SPAWN_MS).status).toBe('window')
  })

  it('marks the boss overdue after the window closes', () => {
    const overdue = spawnSnapshot(KILL, KILL + LATEST_SPAWN_MS + 1)
    expect(overdue.status).toBe('overdue')
    expect(overdue.msOverdue).toBe(1)
  })

  it('turns overdue into stale after 30 minutes', () => {
    const stillOverdue = spawnSnapshot(KILL, KILL + LATEST_SPAWN_MS + STALE_OVERDUE_MS - 1)
    expect(stillOverdue.status).toBe('overdue')
    const stale = spawnSnapshot(KILL, KILL + LATEST_SPAWN_MS + STALE_OVERDUE_MS)
    expect(stale.status).toBe('stale')
  })

  it('marks a scout as alive until 30 minutes pass', () => {
    const fresh = spawnSnapshot(KILL, KILL + 60_000, 'scout')
    expect(fresh.status).toBe('alive')
    expect(fresh.msAlive).toBe(60_000)
    const stillAlive = spawnSnapshot(KILL, KILL + STALE_OVERDUE_MS - 1, 'scout')
    expect(stillAlive.status).toBe('alive')
    const staleScout = spawnSnapshot(KILL, KILL + STALE_OVERDUE_MS, 'scout')
    expect(staleScout.status).toBe('stale')
    expect(staleScout.kind).toBe('scout')
  })
})

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(125_000)).toBe('2:05')
  })

  it('includes hours when needed', () => {
    expect(formatDuration(3_725_000)).toBe('1:02:05')
  })
})

describe('formatElapsed', () => {
  it('starts a just-opened window at 0:01', () => {
    expect(formatElapsed(0)).toBe('0:01')
  })

  it('counts whole seconds after the first', () => {
    expect(formatElapsed(90_000)).toBe('1:30')
  })
})
