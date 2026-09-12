import {
  type BoardDoc,
  type ContestedRecord,
} from '@/lib/board'
import { BOSSES, isChannelId, isServerId, timerKey, type ChannelId, type ServerId } from '@/lib/game'
import { spawnFromRecord, type TimerStatus } from '@/lib/timers'

export type StatusMap = Record<string, TimerStatus>

export function parseContestedKey(key: string): { serverId: ServerId; channel: ChannelId } | null {
  const [serverId, channelRaw] = key.split(':')
  const channel = Number(channelRaw)
  if (!isServerId(serverId) || !isChannelId(channel)) return null
  return { serverId, channel }
}

export function statusMapForBoard(board: BoardDoc, now: number): StatusMap {
  const statuses: StatusMap = {}
  for (const [key, record] of Object.entries(board.timers)) {
    statuses[key] = spawnFromRecord(record, now).status
  }
  return statuses
}

/** True when a report on this channel moved from a real status (not No report) to stale. */
export function channelBecameStale(
  previous: StatusMap,
  current: StatusMap,
  serverId: ServerId,
  channel: ChannelId,
): boolean {
  return BOSSES.some((boss) => {
    const key = timerKey(boss.id, serverId, channel)
    const prev = previous[key] ?? 'unknown'
    const curr = current[key] ?? 'unknown'
    return curr === 'stale' && prev !== 'stale' && prev !== 'unknown'
  })
}

export function staleContestedUpdates(
  board: BoardDoc,
  now: number,
  previous: StatusMap,
): Array<{ key: string; record: ContestedRecord }> {
  const current = statusMapForBoard(board, now)
  const updates: Array<{ key: string; record: ContestedRecord }> = []
  const stamp = new Date(now).toISOString()
  for (const [key, rec] of Object.entries(board.contested ?? {})) {
    if (!rec?.on) continue
    const parsed = parseContestedKey(key)
    if (!parsed) continue
    if (!channelBecameStale(previous, current, parsed.serverId, parsed.channel)) continue
    updates.push({
      key,
      record: {
        on: false,
        updatedAt: stamp,
        reportedBy: rec.reportedBy,
      },
    })
  }
  return updates
}

export function applyStaleContested(
  board: BoardDoc,
  now: number,
  previous: StatusMap,
): BoardDoc {
  const updates = staleContestedUpdates(board, now, previous)
  if (updates.length === 0) return board
  const contested = { ...board.contested }
  for (const { key, record } of updates) {
    contested[key] = record
  }
  return { ...board, contested }
}
