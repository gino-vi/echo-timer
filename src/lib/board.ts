import type { TimerKey } from '@/lib/game'

export const REPORT_KINDS = ['kill', 'scout'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]
export const HISTORY_LIMIT = 5

export type HistoryEntry = {
  killedAt: string
  loggedAt: string
  reportedBy: string
  kind?: ReportKind
}

export type TimerRecord = {
  killedAt: string | null
  updatedAt: string
  reportedBy: string
  /** Missing kind is treated as a kill for older board JSON. */
  kind?: ReportKind
  history?: HistoryEntry[]
}

export function reportKind(record: TimerRecord | HistoryEntry | undefined): ReportKind {
  return record?.kind === 'scout' ? 'scout' : 'kill'
}

function historyKey(entry: HistoryEntry) {
  return `${entry.killedAt}|${entry.loggedAt}|${reportKind(entry)}`
}

export function seedHistory(record: TimerRecord | undefined): HistoryEntry[] {
  if (record?.history?.length) return record.history
  if (!record?.killedAt) return []
  return [
    {
      killedAt: record.killedAt,
      loggedAt: record.updatedAt,
      reportedBy: record.reportedBy,
      kind: reportKind(record),
    },
  ]
}

export function mergeHistoryLists(
  local: HistoryEntry[] | undefined,
  remote: HistoryEntry[] | undefined,
): HistoryEntry[] {
  const map = new Map<string, HistoryEntry>()
  for (const entry of [...(local ?? []), ...(remote ?? [])]) {
    if (!entry?.killedAt || !entry.loggedAt) continue
    const key = historyKey(entry)
    if (!map.has(key)) map.set(key, entry)
  }
  return [...map.values()]
    .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt) || b.killedAt.localeCompare(a.killedAt))
    .slice(0, HISTORY_LIMIT)
}

export function pushHistory(existing: TimerRecord | undefined, entry: HistoryEntry): HistoryEntry[] {
  return mergeHistoryLists(seedHistory(existing), [entry])
}

export function mergeTimerRecords(
  local: TimerRecord | undefined,
  remote: TimerRecord | undefined,
): TimerRecord | undefined {
  if (!local) return remote
  if (!remote) return local
  const newer = local.updatedAt >= remote.updatedAt ? local : remote
  return {
    ...newer,
    history: mergeHistoryLists(seedHistory(local), seedHistory(remote)),
  }
}

export function mergeTimerMaps(
  local: Record<string, TimerRecord> | undefined,
  remote: Record<string, TimerRecord> | undefined,
): Record<string, TimerRecord> {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})])
  const next: Record<string, TimerRecord> = {}
  for (const key of keys) {
    const merged = mergeTimerRecords(local?.[key], remote?.[key])
    if (merged) next[key] = merged
  }
  return next
}

export type ContestedRecord = {
  on: boolean
  updatedAt: string
  reportedBy: string
}

export type BoardDoc = {
  version: 1
  name: string
  timers: Record<string, TimerRecord>
  contested?: Record<string, ContestedRecord>
}

export type Room = {
  ns: string
  key: string
}

export function emptyBoard(name = 'SpiritVale Masters'): BoardDoc {
  return { version: 1, name, timers: {}, contested: {} }
}

export function mergeMaps<T extends { updatedAt: string }>(
  local: Record<string, T> | undefined,
  remote: Record<string, T> | undefined,
): Record<string, T> {
  const keys = new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})])
  const next: Record<string, T> = {}
  for (const key of keys) {
    const a = local?.[key]
    const b = remote?.[key]
    if (a && b) {
      next[key] = a.updatedAt >= b.updatedAt ? a : b
    } else {
      const keep = a ?? b
      if (keep) next[key] = keep
    }
  }
  return next
}

export function mergeBoards(local: BoardDoc, remote: BoardDoc): BoardDoc {
  return {
    version: 1,
    name: local.name || remote.name,
    timers: mergeTimerMaps(local.timers, remote.timers),
    contested: mergeMaps(local.contested, remote.contested),
  }
}

export function encodeRoom(room: Room): string {
  return `${room.ns}.${room.key}`
}

export function decodeRoom(value: string): Room | null {
  const dot = value.indexOf('.')
  if (dot <= 0 || dot === value.length - 1) return null
  const ns = value.slice(0, dot)
  const key = value.slice(dot + 1)
  if (!/^svb-[a-z0-9]{10,16}$/.test(ns)) return null
  if (!/^[a-f0-9]{32,128}$/i.test(key)) return null
  return { ns, key }
}

export function randomNamespace(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  let id = 'svb-'
  for (const byte of bytes) {
    id += alphabet[byte % alphabet.length]
  }
  return id
}

export function getTimer(board: BoardDoc, key: TimerKey): TimerRecord | undefined {
  return board.timers[key]
}

export function setTimer(board: BoardDoc, key: TimerKey, record: TimerRecord): BoardDoc {
  return {
    ...board,
    timers: {
      ...board.timers,
      [key]: record,
    },
  }
}

export function hasKillReports(board: BoardDoc): boolean {
  return Object.values(board.timers).some((record) => record.killedAt != null)
}

export function clearAllTimers(board: BoardDoc, reportedBy: string): BoardDoc {
  const updatedAt = new Date().toISOString()
  const reporter = reportedBy.trim() || 'Anonymous'
  const timers: Record<string, TimerRecord> = {}
  for (const key of Object.keys(board.timers)) {
    timers[key] = {
      killedAt: null,
      updatedAt,
      reportedBy: reporter,
      kind: 'kill',
      history: board.timers[key]?.history,
    }
  }
  return { ...board, timers }
}

export function contestedKey(serverId: string, channel: number) {
  return `${serverId}:${channel}`
}

export function getContested(board: BoardDoc, serverId: string, channel: number): boolean {
  return board.contested?.[contestedKey(serverId, channel)]?.on === true
}

export function setContested(
  board: BoardDoc,
  key: string,
  record: ContestedRecord,
): BoardDoc {
  return {
    ...board,
    contested: {
      ...board.contested,
      [key]: record,
    },
  }
}

export function killedAtMs(record: TimerRecord | undefined): number | null {
  if (!record?.killedAt) return null
  const value = Date.parse(record.killedAt)
  return Number.isNaN(value) ? null : value
}

export type LivePayload =
  | { type: 'patch'; key: string; record: TimerRecord }
  | { type: 'contested'; key: string; record: ContestedRecord }
  | { type: 'snapshot'; board: BoardDoc }

export function applyLivePayload(board: BoardDoc, payload: LivePayload): BoardDoc {
  if (payload.type === 'snapshot') {
    return mergeBoards(board, payload.board)
  }
  if (payload.type === 'contested') {
    const existing = board.contested?.[payload.key]
    if (existing && existing.updatedAt >= payload.record.updatedAt) {
      return board
    }
    return setContested(board, payload.key, payload.record)
  }
  const existing = board.timers[payload.key]
  const merged = mergeTimerRecords(existing, payload.record)
  if (!merged) return board
  if (
    existing &&
    existing.updatedAt === merged.updatedAt &&
    JSON.stringify(existing.history ?? []) === JSON.stringify(merged.history ?? [])
  ) {
    return board
  }
  return setTimer(board, payload.key as TimerKey, merged)
}
