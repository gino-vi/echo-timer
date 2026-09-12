import { describe, expect, it } from 'vitest'
import { LATEST_SPAWN_MS, STALE_OVERDUE_MS } from '@/lib/game'
import { applyStaleContested, channelHasStale, staleContestedUpdates } from '@/lib/contested'
import type { BoardDoc } from '@/lib/board'

const KILL = '2026-09-09T12:00:00.000Z'
const KILL_MS = Date.parse(KILL)
const STALE_AT = KILL_MS + LATEST_SPAWN_MS + STALE_OVERDUE_MS

function boardWith(over: Partial<BoardDoc> = {}): BoardDoc {
  return {
    version: 1,
    name: 'A',
    timers: {
      'berserker:na:1': {
        killedAt: KILL,
        updatedAt: KILL,
        reportedBy: 'Ada',
      },
    },
    contested: {
      'na:1': { on: true, updatedAt: KILL, reportedBy: 'Ada' },
      'na:2': { on: true, updatedAt: KILL, reportedBy: 'Ada' },
    },
    ...over,
  }
}

describe('channelHasStale', () => {
  it('is false while the channel report is still overdue', () => {
    const board = boardWith()
    expect(channelHasStale(board, 'na', 1, STALE_AT - 1)).toBe(false)
  })

  it('is true once any boss on that channel is stale', () => {
    const board = boardWith()
    expect(channelHasStale(board, 'na', 1, STALE_AT)).toBe(true)
    expect(channelHasStale(board, 'na', 2, STALE_AT)).toBe(false)
  })
})

describe('staleContestedUpdates', () => {
  it('turns contested off only on channels that have gone stale', () => {
    const board = boardWith()
    const updates = staleContestedUpdates(board, STALE_AT)
    expect(updates).toHaveLength(1)
    expect(updates[0]?.key).toBe('na:1')
    expect(updates[0]?.record.on).toBe(false)
  })

  it('leaves contested alone when nothing is stale', () => {
    expect(staleContestedUpdates(boardWith(), STALE_AT - 1)).toEqual([])
  })

  it('returns the same board when apply has nothing to do', () => {
    const board = boardWith()
    expect(applyStaleContested(board, STALE_AT - 1)).toBe(board)
  })

  it('clears contested on the stale channel', () => {
    const next = applyStaleContested(boardWith(), STALE_AT)
    expect(next.contested?.['na:1']?.on).toBe(false)
    expect(next.contested?.['na:2']?.on).toBe(true)
  })
})
