import { BOSSES, CHANNELS, SERVERS, timerKey, type BossId, type ChannelId, type ServerId } from '@/lib/game'
import { killedAtMs, type BoardDoc } from '@/lib/board'
import { spawnSnapshot, type TimerStatus } from '@/lib/timers'

export type HuntFilter = 'all' | TimerStatus

export function countStatuses(board: BoardDoc, now: number, serverId?: ServerId) {
  const counts: Record<TimerStatus, number> = {
    unknown: 0,
    dead: 0,
    window: 0,
    overdue: 0,
  }
  for (const boss of BOSSES) {
    for (const server of SERVERS) {
      if (serverId && server.id !== serverId) continue
      for (const channel of CHANNELS) {
        const record = board.timers[timerKey(boss.id, server.id, channel)]
        counts[spawnSnapshot(killedAtMs(record), now).status] += 1
      }
    }
  }
  return counts
}

export function matchesFilter(
  status: TimerStatus,
  filter: HuntFilter,
): boolean {
  return filter === 'all' || status === filter
}

export type SelectedCell = {
  bossId: BossId
  serverId: ServerId
  channel: ChannelId
}
