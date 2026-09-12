import { describe, expect, it } from 'vitest'
import { LATEST_SPAWN_MS, STALE_OVERDUE_MS } from '@/lib/game'
import {
  applyStaleContested,
  channelBecameStale,
  staleContestedUpdates,
  statusMapForBoard,
  type StatusMap,
} from '@/lib/contested'
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

function statusesAt(now: number, over?: Partial<BoardDoc>): StatusMap {
  return statusMapForBoard(boardWith(over), now)
}

describe('channelBecameStale', () => {
  it('is false when the report was already stale', () => {
    const stale = { 'berserker:na:1': 'stale' } as StatusMap
    expect(channelBecameStale(stale, stale, 'na', 1)).toBe(false)
  })

  it('is false when No report becomes stale', () => {
    const previous = { 'berserker:na:1': 'unknown' } as StatusMap
    const current = { 'berserker:na:1': 'stale' } as StatusMap
    expect(channelBecameStale(previous, current, 'na', 1)).toBe(false)
  })

  it('is true when overdue or alive turns stale', () => {
    expect(
      channelBecameStale(
        { 'berserker:na:1': 'overdue' },
        { 'berserker:na:1': 'stale' },
        'na',
        1,
      ),
    ).toBe(true)
    expect(
      channelBecameStale(
        { 'berserker:na:1': 'alive' },
        { 'berserker:na:1': 'stale' },
        'na',
        1,
      ),
    ).toBe(true)
  })
})

describe('staleContestedUpdates', () => {
  it('does not clear contested just because a stale report is already present', () => {
    const board = boardWith()
    const alreadyStale = statusesAt(STALE_AT)
    expect(alreadyStale['berserker:na:1']).toBe('stale')
    expect(staleContestedUpdates(board, STALE_AT, alreadyStale)).toEqual([])
  })

  it('does not clear contested when No report jumps straight to stale', () => {
    const board = boardWith()
    const previous = statusesAt(STALE_AT - 1, { timers: {} })
    expect(previous['berserker:na:1']).toBeUndefined()
    expect(staleContestedUpdates(board, STALE_AT, previous)).toEqual([])
  })

  it('turns contested off when a real status becomes stale', () => {
    const board = boardWith()
    const previous = statusesAt(STALE_AT - 1)
    expect(previous['berserker:na:1']).toBe('overdue')
    const updates = staleContestedUpdates(board, STALE_AT, previous)
    expect(updates).toHaveLength(1)
    expect(updates[0]?.key).toBe('na:1')
    expect(updates[0]?.record.on).toBe(false)
  })

  it('leaves contested alone when nothing becomes stale', () => {
    const board = boardWith()
    expect(staleContestedUpdates(board, STALE_AT - 1, statusesAt(STALE_AT - 1))).toEqual([])
  })

  it('returns the same board when apply has nothing to do', () => {
    const board = boardWith()
    expect(applyStaleContested(board, STALE_AT, statusesAt(STALE_AT))).toBe(board)
  })

  it('clears contested on the channel that just went stale', () => {
    const next = applyStaleContested(boardWith(), STALE_AT, statusesAt(STALE_AT - 1))
    expect(next.contested?.['na:1']?.on).toBe(false)
    expect(next.contested?.['na:2']?.on).toBe(true)
  })
})
