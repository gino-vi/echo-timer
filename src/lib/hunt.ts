import { parseTimerKey, type BossId, type ChannelId, type ServerId } from '@/lib/game'
import { killedAtMs, type BoardDoc, type TimerRecord } from '@/lib/board'
import { spawnSnapshot, type SpawnSnapshot } from '@/lib/timers'

/** Show a dead boss in Hunt now this long before the window opens. */
export const HUNT_SOON_MS = 5 * 60 * 1000

export const HUNT_PRIORITIES = ['overdue', 'window', 'soon'] as const
export type HuntPriority = (typeof HUNT_PRIORITIES)[number]

export type HuntRow = {
  key: string
  bossId: BossId
  serverId: ServerId
  channel: ChannelId
  record: TimerRecord
  snap: SpawnSnapshot
  priority: HuntPriority
}

function huntPriority(snap: SpawnSnapshot): HuntPriority | null {
  if (snap.status === 'window') return 'window'
  if (snap.status === 'overdue') return 'overdue'
  if (snap.status === 'dead' && snap.msUntilWindow > 0 && snap.msUntilWindow <= HUNT_SOON_MS) {
    return 'soon'
  }
  return null
}

function urgencyMs(row: HuntRow): number {
  if (row.priority === 'overdue') return row.snap.msOverdue
  if (row.priority === 'window') return row.snap.msLeftInWindow
  return row.snap.msUntilWindow
}

export function listHuntNow(board: BoardDoc, now: number, serverId: ServerId): HuntRow[] {
  const rows: HuntRow[] = []
  for (const [key, record] of Object.entries(board.timers)) {
    const parsed = parseTimerKey(key)
    if (!parsed || parsed.serverId !== serverId) continue
    const snap = spawnSnapshot(killedAtMs(record), now)
    const priority = huntPriority(snap)
    if (!priority) continue
    rows.push({
      key,
      bossId: parsed.bossId,
      serverId: parsed.serverId,
      channel: parsed.channel,
      record,
      snap,
      priority,
    })
  }

  return rows.sort((a, b) => {
    const rank = HUNT_PRIORITIES.indexOf(a.priority) - HUNT_PRIORITIES.indexOf(b.priority)
    if (rank !== 0) return rank
    return urgencyMs(a) - urgencyMs(b)
  })
}
