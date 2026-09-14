import { describe, expect, it } from 'vitest'
import {
  applyLivePayload,
  clearAllTimers,
  decodeRoom,
  encodeRoom,
  mergeBoards,
  pushHistory,
  type BoardDoc,
} from '@/lib/board'

describe('mergeBoards', () => {
  it('keeps the newest report per boss channel', () => {
    const local: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {
        'berserker:na:1': {
          killedAt: '2026-09-09T01:00:00.000Z',
          updatedAt: '2026-09-09T01:05:00.000Z',
          reportedBy: 'Ada',
        },
        'wizard:na:2': {
          killedAt: '2026-09-09T02:00:00.000Z',
          updatedAt: '2026-09-09T02:00:00.000Z',
          reportedBy: 'Ada',
        },
      },
    }
    const remote: BoardDoc = {
      version: 1,
      name: 'B',
      timers: {
        'berserker:na:1': {
          killedAt: '2026-09-09T01:10:00.000Z',
          updatedAt: '2026-09-09T01:10:00.000Z',
          reportedBy: 'Ben',
        },
        'priest:eu:3': {
          killedAt: null,
          updatedAt: '2026-09-09T03:00:00.000Z',
          reportedBy: 'Ben',
        },
      },
    }

    const merged = mergeBoards(local, remote)
    expect(merged.timers['berserker:na:1']?.reportedBy).toBe('Ben')
    expect(merged.timers['wizard:na:2']?.reportedBy).toBe('Ada')
    expect(merged.timers['priest:eu:3']?.killedAt).toBeNull()
  })

  it('keeps up to five log times when merging channel history', () => {
    const local: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {
        'berserker:na:1': {
          killedAt: '2026-09-09T01:10:00.000Z',
          updatedAt: '2026-09-09T01:10:00.000Z',
          reportedBy: 'Ada',
          history: [
            {
              killedAt: '2026-09-09T01:10:00.000Z',
              loggedAt: '2026-09-09T01:10:00.000Z',
              reportedBy: 'Ada',
              kind: 'kill',
            },
            {
              killedAt: '2026-09-09T00:40:00.000Z',
              loggedAt: '2026-09-09T00:40:00.000Z',
              reportedBy: 'Ada',
              kind: 'kill',
            },
          ],
        },
      },
    }
    const remote: BoardDoc = {
      version: 1,
      name: 'B',
      timers: {
        'berserker:na:1': {
          killedAt: '2026-09-09T01:20:00.000Z',
          updatedAt: '2026-09-09T01:20:00.000Z',
          reportedBy: 'Ben',
          history: [
            {
              killedAt: '2026-09-09T01:20:00.000Z',
              loggedAt: '2026-09-09T01:20:00.000Z',
              reportedBy: 'Ben',
              kind: 'scout',
            },
            {
              killedAt: '2026-09-09T00:10:00.000Z',
              loggedAt: '2026-09-09T00:10:00.000Z',
              reportedBy: 'Ben',
              kind: 'kill',
            },
          ],
        },
      },
    }
    const merged = mergeBoards(local, remote)
    expect(merged.timers['berserker:na:1']?.reportedBy).toBe('Ben')
    expect(merged.timers['berserker:na:1']?.history?.map((entry) => entry.killedAt)).toEqual([
      '2026-09-09T01:20:00.000Z',
      '2026-09-09T01:10:00.000Z',
      '2026-09-09T00:40:00.000Z',
      '2026-09-09T00:10:00.000Z',
    ])
  })

  it('keeps the newest contested flag per channel', () => {
    const local: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {},
      contested: {
        'na:1': { on: true, updatedAt: '2026-09-09T01:00:00.000Z', reportedBy: 'Ada' },
        'na:2': { on: true, updatedAt: '2026-09-09T01:00:00.000Z', reportedBy: 'Ada' },
      },
    }
    const remote: BoardDoc = {
      version: 1,
      name: 'B',
      timers: {},
      contested: {
        'na:1': { on: false, updatedAt: '2026-09-09T01:10:00.000Z', reportedBy: 'Ben' },
        'eu:3': { on: true, updatedAt: '2026-09-09T01:00:00.000Z', reportedBy: 'Ben' },
      },
    }
    const merged = mergeBoards(local, remote)
    expect(merged.contested?.['na:1']?.on).toBe(false)
    expect(merged.contested?.['na:2']?.on).toBe(true)
    expect(merged.contested?.['eu:3']?.on).toBe(true)
  })
})

describe('clearAllTimers', () => {
  it('nulls every kill so a later merge cannot revive them', () => {
    const local: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {
        'berserker:na:1': {
          killedAt: '2026-09-09T01:00:00.000Z',
          updatedAt: '2026-09-09T01:00:00.000Z',
          reportedBy: 'Ada',
        },
      },
    }
    const cleared = clearAllTimers(local, 'Ada')
    expect(cleared.timers['berserker:na:1']?.killedAt).toBeNull()
    const remoteStillHasKill: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {
        'berserker:na:1': {
          killedAt: '2026-09-09T01:00:00.000Z',
          updatedAt: '2026-09-09T01:00:00.000Z',
          reportedBy: 'Ada',
        },
      },
    }
    expect(mergeBoards(cleared, remoteStillHasKill).timers['berserker:na:1']?.killedAt).toBeNull()
  })
})

describe('applyLivePayload', () => {
  it('applies a newer live patch immediately', () => {
    const board: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {
        'berserker:asia:1': {
          killedAt: '2026-09-09T01:00:00.000Z',
          updatedAt: '2026-09-09T01:00:00.000Z',
          reportedBy: 'Ada',
        },
      },
    }
    const next = applyLivePayload(board, {
      type: 'patch',
      key: 'wizard:na:2',
      record: {
        killedAt: '2026-09-09T01:02:00.000Z',
        updatedAt: '2026-09-09T01:02:00.000Z',
        reportedBy: 'Ben',
      },
    })
    expect(next.timers['wizard:na:2']?.reportedBy).toBe('Ben')
    expect(next.timers['berserker:asia:1']?.reportedBy).toBe('Ada')
  })

  it('ignores an older patch for the same cell', () => {
    const board: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {
        'wizard:na:2': {
          killedAt: '2026-09-09T01:10:00.000Z',
          updatedAt: '2026-09-09T01:10:00.000Z',
          reportedBy: 'Ben',
        },
      },
    }
    const next = applyLivePayload(board, {
      type: 'patch',
      key: 'wizard:na:2',
      record: {
        killedAt: '2026-09-09T01:00:00.000Z',
        updatedAt: '2026-09-09T01:00:00.000Z',
        reportedBy: 'Ada',
      },
    })
    expect(next.timers['wizard:na:2']?.reportedBy).toBe('Ben')
  })

  it('applies a newer contested patch', () => {
    const board: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {},
      contested: {
        'na:1': { on: false, updatedAt: '2026-09-09T01:00:00.000Z', reportedBy: 'Ada' },
      },
    }
    const next = applyLivePayload(board, {
      type: 'contested',
      key: 'na:1',
      record: { on: true, updatedAt: '2026-09-09T01:02:00.000Z', reportedBy: 'Ben' },
    })
    expect(next.contested?.['na:1']?.on).toBe(true)
    expect(next.contested?.['na:1']?.reportedBy).toBe('Ben')
  })

  it('ignores an older contested patch', () => {
    const board: BoardDoc = {
      version: 1,
      name: 'A',
      timers: {},
      contested: {
        'na:1': { on: true, updatedAt: '2026-09-09T01:10:00.000Z', reportedBy: 'Ben' },
      },
    }
    const next = applyLivePayload(board, {
      type: 'contested',
      key: 'na:1',
      record: { on: false, updatedAt: '2026-09-09T01:00:00.000Z', reportedBy: 'Ada' },
    })
    expect(next.contested?.['na:1']?.on).toBe(true)
  })
})

describe('encodeRoom', () => {
  it('round-trips a claimed board token', () => {
    const room = { ns: 'svb-abc123xyz9', key: 'aabbccddeeff00112233445566778899' }
    expect(decodeRoom(encodeRoom(room))).toEqual(room)
  })

  it('rejects malformed tokens', () => {
    expect(decodeRoom('not-a-room')).toBeNull()
    expect(decodeRoom('svb-abc.nothex')).toBeNull()
  })
})

describe('pushHistory', () => {
  it('keeps only the five newest logs', () => {
    let record = undefined
    for (let hour = 1; hour <= 7; hour += 1) {
      const stamp = `2026-09-09T${String(hour).padStart(2, '0')}:00:00.000Z`
      record = {
        killedAt: stamp,
        updatedAt: stamp,
        reportedBy: 'Ada',
        kind: 'kill' as const,
        history: pushHistory(record, {
          killedAt: stamp,
          loggedAt: stamp,
          reportedBy: 'Ada',
          kind: 'kill',
        }),
      }
    }
    expect(record?.history).toHaveLength(5)
    expect(record?.history?.[0]?.killedAt).toBe('2026-09-09T07:00:00.000Z')
    expect(record?.history?.[4]?.killedAt).toBe('2026-09-09T03:00:00.000Z')
  })
})
