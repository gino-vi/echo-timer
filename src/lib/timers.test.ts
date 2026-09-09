import { describe, expect, it } from 'vitest'
import { DEAD_MS, EARLIEST_SPAWN_MS, LATEST_SPAWN_MS } from '@/lib/game'
import { formatDuration, spawnSnapshot } from '@/lib/timers'

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
    expect(atWindow.msLeftInWindow).toBe(LATEST_SPAWN_MS - EARLIEST_SPAWN_MS)
  })

  it('stays in window until the 90-minute mark', () => {
    expect(spawnSnapshot(KILL, KILL + LATEST_SPAWN_MS).status).toBe('window')
  })

  it('marks the boss overdue after the window closes', () => {
    const overdue = spawnSnapshot(KILL, KILL + LATEST_SPAWN_MS + 1)
    expect(overdue.status).toBe('overdue')
    expect(overdue.msOverdue).toBe(1)
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
