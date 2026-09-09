import { describe, expect, it } from 'vitest'
import { decodeRoom, encodeRoom, mergeBoards, type BoardDoc } from '@/lib/board'

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
