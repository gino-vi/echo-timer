import { describe, expect, it } from 'vitest'
import { EARLIEST_SPAWN_MS, LATEST_SPAWN_MS, STALE_OVERDUE_MS } from '@/lib/game'
import { HUNT_SOON_MS, listHuntNow } from '@/lib/hunt'
import type { BoardDoc } from '@/lib/board'

const KILL = Date.parse('2026-09-09T12:00:00.000Z')

function boardAt(offsets: Record<string, number>): BoardDoc {
  const timers: BoardDoc['timers'] = {}
  for (const [key, killedAt] of Object.entries(offsets)) {
    timers[key] = {
      killedAt: new Date(killedAt).toISOString(),
      updatedAt: new Date(killedAt).toISOString(),
      reportedBy: 'Ada',
    }
  }
  return { version: 1, name: 'Test', timers }
}

describe('listHuntNow', () => {
  it('keeps the selected server only', () => {
    const now = KILL + EARLIEST_SPAWN_MS + 60_000
    const rows = listHuntNow(
      boardAt({
        'berserker:na:1': KILL,
        'wizard:asia:1': KILL,
      }),
      now,
      'na',
    )
    expect(rows.map((row) => row.key)).toEqual(['berserker:na:1'])
  })

  it('keeps a recent overdue and drops a stale one', () => {
    const now = KILL + LATEST_SPAWN_MS + 60_000
    const staleKill = KILL - STALE_OVERDUE_MS - 60_000
    const rows = listHuntNow(
      boardAt({
        'berserker:na:1': KILL,
        'priest:na:2': staleKill,
      }),
      now,
      'na',
    )
    expect(rows.map((row) => row.key)).toEqual(['berserker:na:1'])
    expect(rows[0]?.priority).toBe('overdue')
  })

  it('includes dead bosses whose window opens within 5 minutes', () => {
    const now = KILL + EARLIEST_SPAWN_MS - 4 * 60_000
    const rows = listHuntNow(boardAt({ 'gunslinger:na:2': KILL }), now, 'na')
    expect(rows[0]?.priority).toBe('soon')
  })

  it('includes a window that opens in exactly 5 minutes', () => {
    const now = KILL + EARLIEST_SPAWN_MS - HUNT_SOON_MS
    const rows = listHuntNow(boardAt({ 'gunslinger:na:2': KILL }), now, 'na')
    expect(rows[0]?.priority).toBe('soon')
  })

  it('excludes dead bosses that are still far from the window', () => {
    const now = KILL + EARLIEST_SPAWN_MS - HUNT_SOON_MS - 60_000
    const rows = listHuntNow(boardAt({ 'gunslinger:na:2': KILL }), now, 'na')
    expect(rows).toEqual([])
  })
})
