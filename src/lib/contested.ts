import {
  type BoardDoc,
  type ContestedRecord,
} from '@/lib/board'
import { BOSSES, isChannelId, isServerId, timerKey, type ChannelId, type ServerId } from '@/lib/game'
import { spawnFromRecord } from '@/lib/timers'

export function parseContestedKey(key: string): { serverId: ServerId; channel: ChannelId } | null {
  const [serverId, channelRaw] = key.split(':')
  const channel = Number(channelRaw)
  if (!isServerId(serverId) || !isChannelId(channel)) return null
  return { serverId, channel }
}

export function channelHasStale(
  board: BoardDoc,
  serverId: ServerId,
  channel: ChannelId,
  now: number,
): boolean {
  return BOSSES.some((boss) => {
    const record = board.timers[timerKey(boss.id, serverId, channel)]
    return spawnFromRecord(record, now).status === 'stale'
  })
}

export function staleContestedUpdates(
  board: BoardDoc,
  now: number,
): Array<{ key: string; record: ContestedRecord }> {
  const updates: Array<{ key: string; record: ContestedRecord }> = []
  const stamp = new Date(now).toISOString()
  for (const [key, rec] of Object.entries(board.contested ?? {})) {
    if (!rec?.on) continue
    const parsed = parseContestedKey(key)
    if (!parsed) continue
    if (!channelHasStale(board, parsed.serverId, parsed.channel, now)) continue
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

export function applyStaleContested(board: BoardDoc, now: number): BoardDoc {
  const updates = staleContestedUpdates(board, now)
  if (updates.length === 0) return board
  const contested = { ...board.contested }
  for (const { key, record } of updates) {
    contested[key] = record
  }
  return { ...board, contested }
}
