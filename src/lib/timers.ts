import { EARLIEST_SPAWN_MS, LATEST_SPAWN_MS } from '@/lib/game'

export const TIMER_STATUSES = ['unknown', 'dead', 'window', 'overdue'] as const
export type TimerStatus = (typeof TIMER_STATUSES)[number]

export type SpawnSnapshot = {
  status: TimerStatus
  killedAt: number | null
  earliestSpawnAt: number | null
  latestSpawnAt: number | null
  /** Milliseconds until the spawn window opens. 0 if already open or unknown. */
  msUntilWindow: number
  /** Milliseconds remaining in the spawn window. 0 if not in the window. */
  msLeftInWindow: number
  /** Milliseconds since the window closed. 0 if not overdue. */
  msOverdue: number
}

export function spawnSnapshot(killedAt: number | null, now: number): SpawnSnapshot {
  if (killedAt == null || Number.isNaN(killedAt)) {
    return {
      status: 'unknown',
      killedAt: null,
      earliestSpawnAt: null,
      latestSpawnAt: null,
      msUntilWindow: 0,
      msLeftInWindow: 0,
      msOverdue: 0,
    }
  }

  const earliestSpawnAt = killedAt + EARLIEST_SPAWN_MS
  const latestSpawnAt = killedAt + LATEST_SPAWN_MS

  if (now < earliestSpawnAt) {
    return {
      status: 'dead',
      killedAt,
      earliestSpawnAt,
      latestSpawnAt,
      msUntilWindow: earliestSpawnAt - now,
      msLeftInWindow: 0,
      msOverdue: 0,
    }
  }

  if (now <= latestSpawnAt) {
    return {
      status: 'window',
      killedAt,
      earliestSpawnAt,
      latestSpawnAt,
      msUntilWindow: 0,
      msLeftInWindow: latestSpawnAt - now,
      msOverdue: 0,
    }
  }

  return {
    status: 'overdue',
    killedAt,
    earliestSpawnAt,
    latestSpawnAt,
    msUntilWindow: 0,
    msLeftInWindow: 0,
    msOverdue: now - latestSpawnAt,
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${minutes}:${pad(seconds)}`
}
