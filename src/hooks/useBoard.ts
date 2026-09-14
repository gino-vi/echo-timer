import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyLivePayload,
  clearAllTimers,
  contestedKey,
  decodeRoom,
  encodeRoom,
  hasKillReports,
  mergeBoards,
  pushHistory,
  randomNamespace,
  setContested,
  setTimer,
  type BoardDoc,
  type ContestedRecord,
  type HistoryEntry,
  type LivePayload,
  type Room,
  type TimerRecord,
  type ReportKind,
} from '@/lib/board'
import { isServerId, type ChannelId, type ServerId, type TimerKey } from '@/lib/game'
import { staleContestedUpdates, statusMapForBoard, type StatusMap } from '@/lib/contested'
import { useNow } from '@/hooks/useNow'
import {
  loadLocalBoard,
  loadLocalRoom,
  loadPlayerName,
  loadServerId,
  saveLocalBoard,
  saveLocalRoom,
  savePlayerName,
  saveServerId,
} from '@/lib/localStore'
import { connectLiveRoom, type LiveChannel } from '@/lib/liveSync'
import { claimNamespace, fetchBoard, saveBoard } from '@/lib/remoteStore'
import type { RemotePlayer } from '@/lib/players'

export type SyncState = 'local' | 'connecting' | 'live' | 'error'

const FAST_POLL_MS = 3000
const SLOW_POLL_MS = 20000

function roomFromUrl(): Room | null {
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('board')
  return raw ? decodeRoom(raw) : null
}

function writeRoomToUrl(room: Room | null) {
  const url = new URL(window.location.href)
  if (room) {
    url.searchParams.set('board', encodeRoom(room))
  } else {
    url.searchParams.delete('board')
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}

export function useBoard() {
  const [board, setBoard] = useState<BoardDoc>(() => loadLocalBoard())
  const [room, setRoom] = useState<Room | null>(() => roomFromUrl() ?? loadLocalRoom())
  const [syncState, setSyncState] = useState<SyncState>(() =>
    roomFromUrl() || loadLocalRoom() ? 'connecting' : 'local',
  )
  const [syncError, setSyncError] = useState<string | null>(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayer[]>([])
  const [playerName, setPlayerNameState] = useState(() => loadPlayerName())
  const [serverId, setServerIdState] = useState<ServerId>(() => {
    const saved = loadServerId()
    return saved && isServerId(saved) ? saved : 'na'
  })

  const boardRef = useRef(board)
  const roomRef = useRef(room)
  const liveRef = useRef<LiveChannel | null>(null)
  const playerCountRef = useRef(0)
  const playerNameRef = useRef(playerName)
  const writeChain = useRef(Promise.resolve())
  const prevStatusesRef = useRef<StatusMap>({})
  const nowMs = useNow(1000)

  useEffect(() => {
    playerNameRef.current = playerName
    liveRef.current?.setName(playerName)
  }, [playerName])

  useEffect(() => {
    boardRef.current = board
    saveLocalBoard(board)
  }, [board])

  useEffect(() => {
    roomRef.current = room
    saveLocalRoom(room)
    writeRoomToUrl(room)
  }, [room])

  const applyIncoming = useCallback((payload: LivePayload) => {
    const next = applyLivePayload(boardRef.current, payload)
    if (next === boardRef.current) return
    boardRef.current = next
    setBoard(next)
  }, [])

  const pushRemote = useCallback(async (next: BoardDoc) => {
    const currentRoom = roomRef.current
    if (!currentRoom) return
    try {
      const remote = await fetchBoard(currentRoom)
      const merged = remote ? mergeBoards(next, remote) : next
      await saveBoard(currentRoom, merged)
      boardRef.current = merged
      setBoard(merged)
      setSyncState('live')
      setSyncError(null)
    } catch (error) {
      setSyncState('error')
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    }
  }, [])

  const enqueuePush = useCallback(
    (next: BoardDoc) => {
      writeChain.current = writeChain.current.then(() => pushRemote(next)).catch(() => undefined)
    },
    [pushRemote],
  )

  const broadcast = useCallback((payload: LivePayload) => {
    liveRef.current?.send(payload)
  }, [])

  const refreshRemote = useCallback(async () => {
    const currentRoom = roomRef.current
    if (!currentRoom) return
    try {
      const remote = await fetchBoard(currentRoom)
      if (!remote) {
        await saveBoard(currentRoom, boardRef.current)
        setSyncState('live')
        setSyncError(null)
        return
      }
      const merged = mergeBoards(boardRef.current, remote)
      const changed =
        JSON.stringify(merged.timers) !== JSON.stringify(boardRef.current.timers) ||
        JSON.stringify(merged.contested ?? {}) !==
          JSON.stringify(boardRef.current.contested ?? {})
      if (changed) {
        boardRef.current = merged
        setBoard(merged)
      }
      setSyncState('live')
      setSyncError(null)
    } catch (error) {
      setSyncState('error')
      setSyncError(error instanceof Error ? error.message : 'Could not refresh the board')
    }
  }, [])

  useEffect(() => {
    if (!room) {
      setPlayerCount(0)
      playerCountRef.current = 0
      setRemotePlayers([])
      liveRef.current = null
      return
    }

    const channel = connectLiveRoom(room.ns, {
      getBoard: () => boardRef.current,
      getName: () => playerNameRef.current,
      onMessage: applyIncoming,
      onPeers: (count) => {
        playerCountRef.current = count
        setPlayerCount(count)
      },
      onPlayers: setRemotePlayers,
    })
    liveRef.current = channel
    return () => {
      channel.leave()
      if (liveRef.current === channel) {
        liveRef.current = null
      }
    }
  }, [room, applyIncoming])

  useEffect(() => {
    if (!room) {
      return
    }
    void refreshRemote()

    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      const delay = playerCountRef.current > 0 ? SLOW_POLL_MS : FAST_POLL_MS
      timer = window.setTimeout(tick, delay)
    }
    const tick = () => {
      if (document.visibilityState !== 'hidden') {
        void refreshRemote()
      }
      schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [room, refreshRemote])

  const updatePlayerName = useCallback((name: string) => {
    setPlayerNameState(name)
    savePlayerName(name)
  }, [])

  const updateServerId = useCallback((id: ServerId) => {
    setServerIdState(id)
    saveServerId(id)
  }, [])

  useEffect(() => {
    const current = statusMapForBoard(boardRef.current, nowMs)
    const updates = staleContestedUpdates(boardRef.current, nowMs, prevStatusesRef.current)
    prevStatusesRef.current = current
    if (updates.length === 0) return
    let next = boardRef.current
    for (const { key, record } of updates) {
      next = setContested(next, key, record)
      broadcast({ type: 'contested', key, record })
    }
    boardRef.current = next
    setBoard(next)
    enqueuePush(next)
  }, [nowMs, board, broadcast, enqueuePush])

  const toggleContested = useCallback(
    (serverId: ServerId, channel: ChannelId, reporter = playerName) => {
      const key = contestedKey(serverId, channel)
      const existing = boardRef.current.contested?.[key]
      const record: ContestedRecord = {
        on: !existing?.on,
        updatedAt: new Date().toISOString(),
        reportedBy: reporter.trim() || 'Anonymous',
      }
      const next = setContested(boardRef.current, key, record)
      boardRef.current = next
      setBoard(next)
      broadcast({ type: 'contested', key, record })
      enqueuePush(next)
    },
    [broadcast, enqueuePush, playerName],
  )

  const reportKill = useCallback(
    (key: TimerKey, killedAt: Date, reporter = playerName, kind: ReportKind = 'kill') => {
      const existing = boardRef.current.timers[key]
      const loggedAt = new Date().toISOString()
      const reportedBy = reporter.trim() || 'Anonymous'
      const reportKindValue: ReportKind = kind === 'scout' ? 'scout' : 'kill'
      const entry: HistoryEntry = {
        killedAt: killedAt.toISOString(),
        loggedAt,
        reportedBy,
        kind: reportKindValue,
      }
      const record: TimerRecord = {
        killedAt: entry.killedAt,
        updatedAt: loggedAt,
        reportedBy,
        kind: reportKindValue,
        history: pushHistory(existing, entry),
      }
      const next = setTimer(boardRef.current, key, record)
      boardRef.current = next
      setBoard(next)
      broadcast({ type: 'patch', key, record })
      enqueuePush(next)
    },
    [broadcast, enqueuePush, playerName],
  )

  const clearTimer = useCallback(
    (key: TimerKey, reporter = playerName) => {
      const existing = boardRef.current.timers[key]
      const record: TimerRecord = {
        killedAt: null,
        updatedAt: new Date().toISOString(),
        reportedBy: reporter.trim() || 'Anonymous',
        kind: 'kill',
        history: existing?.history,
      }
      const next = setTimer(boardRef.current, key, record)
      boardRef.current = next
      setBoard(next)
      broadcast({ type: 'patch', key, record })
      enqueuePush(next)
    },
    [broadcast, enqueuePush, playerName],
  )

  const clearAllTimersOnBoard = useCallback(
    (reporter = playerName) => {
      const next = clearAllTimers(boardRef.current, reporter)
      boardRef.current = next
      setBoard(next)
      broadcast({ type: 'snapshot', board: next })
      enqueuePush(next)
    },
    [broadcast, enqueuePush, playerName],
  )

  const createSharedBoard = useCallback(async () => {
    setSyncState('connecting')
    setSyncError(null)
    try {
      let lastError: Error | null = null
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const ns = randomNamespace()
        try {
          const key = await claimNamespace(ns)
          const nextRoom = { ns, key }
          await saveBoard(nextRoom, boardRef.current)
          setRoom(nextRoom)
          setSyncState('live')
          return encodeRoom(nextRoom)
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Could not create board')
        }
      }
      throw lastError ?? new Error('Could not create a shared board')
    } catch (error) {
      setSyncState(roomRef.current ? 'error' : 'local')
      setSyncError(error instanceof Error ? error.message : 'Could not create a shared board')
      throw error
    }
  }, [])

  const importBoard = useCallback(
    (incoming: BoardDoc) => {
      const next = mergeBoards(incoming, boardRef.current)
      boardRef.current = next
      setBoard(next)
      broadcast({ type: 'snapshot', board: next })
      enqueuePush(next)
    },
    [broadcast, enqueuePush],
  )

  const leaveBoard = useCallback(() => {
    if (!roomRef.current) return
    setRoom(null)
    setSyncState('local')
    setSyncError(null)
    setPlayerCount(0)
    playerCountRef.current = 0
    setRemotePlayers([])
  }, [])

  const partyUrl = room
    ? `${window.location.origin}${window.location.pathname}?board=${encodeURIComponent(encodeRoom(room))}`
    : null

  return {
    board,
    room,
    syncState,
    syncError,
    playerCount,
    remotePlayers,
    playerName,
    serverId,
    partyUrl,
    updatePlayerName,
    updateServerId,
    reportKill,
    toggleContested,
    clearTimer,
    clearAllTimers: clearAllTimersOnBoard,
    createSharedBoard,
    leaveBoard,
    importBoard,
    refreshRemote,
    hasReports: hasKillReports(board),
  }
}
