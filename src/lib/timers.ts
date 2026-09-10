import { EARLIEST_SPAWN_MS, LATEST_SPAWN_MS, STALE_OVERDUE_MS } from '@/lib/game'
import { killedAtMs, reportKind, type ReportKind, type TimerRecord } from '@/lib/board'

export const TIMER_STATUSES = ['unknown', 'dead', 'window', 'overdue', 'alive', 'stale'] as const
export type TimerStatus = (typeof TIMER_STATUSES)[number]

export type SpawnSnapshot = {
  status: TimerStatus
  kind: ReportKind
  killedAt: number | null
  earliestSpawnAt: number | null
  latestSpawnAt: number | null
  /** Milliseconds until the spawn window opens. 0 if already open or unknown. */
  msUntilWindow: number
  /** Milliseconds remaining in the spawn window. 0 if not in the window. */
  msLeftInWindow: number
  /** Milliseconds since the spawn window opened. 0 if not in the window. */
  msWindowOpen: number
  /** Milliseconds since a scout. 0 if not an alive scout. */
  msAlive: number
  /** Milliseconds since the window closed. 0 if not overdue or stale. */
  msOverdue: number
}

const EMPTY_CLOCK = {
  msUntilWindow: 0,
  msLeftInWindow: 0,
  msWindowOpen: 0,
  msAlive: 0,
  msOverdue: 0,
}

export function spawnFromRecord(record: TimerRecord | undefined, now: number): SpawnSnapshot {
  return spawnSnapshot(killedAtMs(record), now, reportKind(record))
}

export function spawnSnapshot(
  killedAt: number | null,
  now: number,
  kind: ReportKind = 'kill',
): SpawnSnapshot {
  if (killedAt == null || Number.isNaN(killedAt)) {
    return {
      status: 'unknown',
      kind: 'kill',
      killedAt: null,
      earliestSpawnAt: null,
      latestSpawnAt: null,
      ...EMPTY_CLOCK,
    }
  }

  if (kind === 'scout') {
    const age = now - killedAt
    const emptyTimes = { kind, killedAt, earliestSpawnAt: null, latestSpawnAt: null }
    if (age < STALE_OVERDUE_MS) {
      return {
        status: 'alive',
        ...emptyTimes,
        ...EMPTY_CLOCK,
        msAlive: Math.max(0, age),
      }
    }
    return {
      status: 'stale',
      ...emptyTimes,
      ...EMPTY_CLOCK,
      msOverdue: age - STALE_OVERDUE_MS,
    }
  }

  const earliestSpawnAt = killedAt + EARLIEST_SPAWN_MS
  const latestSpawnAt = killedAt + LATEST_SPAWN_MS
  const emptyTimes = { kind: 'kill' as const, killedAt, earliestSpawnAt, latestSpawnAt }

  if (now < earliestSpawnAt) {
    return {
      status: 'dead',
      ...emptyTimes,
      ...EMPTY_CLOCK,
      msUntilWindow: earliestSpawnAt - now,
    }
  }

  if (now <= latestSpawnAt) {
    return {
      status: 'window',
      ...emptyTimes,
      ...EMPTY_CLOCK,
      msLeftInWindow: latestSpawnAt - now,
      msWindowOpen: now - earliestSpawnAt,
    }
  }

  const msOverdue = now - latestSpawnAt
  if (msOverdue < STALE_OVERDUE_MS) {
    return {
      status: 'overdue',
      ...emptyTimes,
      ...EMPTY_CLOCK,
      msOverdue,
    }
  }

  return {
    status: 'stale',
    ...emptyTimes,
    ...EMPTY_CLOCK,
    msOverdue,
  }
}

/** Count-up clock. A just-opened window starts at 0:01 instead of 0:00. */
export function formatElapsed(ms: number): string {
  return formatDuration(Math.max(1000, ms))
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
