import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyLivePayload,
  clearAllTimers,
  decodeRoom,
  encodeRoom,
  hasKillReports,
  mergeBoards,
  randomNamespace,
  setTimer,
  type BoardDoc,
  type LivePayload,
  type Room,
  type TimerRecord,
} from '@/lib/board'
import type { TimerKey } from '@/lib/game'
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
import { isServerId, type ServerId } from '@/lib/game'

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
  const [hunterCount, setHunterCount] = useState(0)
  const [playerName, setPlayerNameState] = useState(() => loadPlayerName())
  const [serverId, setServerIdState] = useState<ServerId>(() => {
    const saved = loadServerId()
    return saved && isServerId(saved) ? saved : 'na'
  })

  const boardRef = useRef(board)
  const roomRef = useRef(room)
  const liveRef = useRef<LiveChannel | null>(null)
  const hunterCountRef = useRef(0)
  const writeChain = useRef(Promise.resolve())

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
      const changed = JSON.stringify(merged.timers) !== JSON.stringify(boardRef.current.timers)
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
      setHunterCount(0)
      hunterCountRef.current = 0
      liveRef.current = null
      return
    }

    const channel = connectLiveRoom(room.ns, {
      getBoard: () => boardRef.current,
      onMessage: applyIncoming,
      onPeers: (count) => {
        hunterCountRef.current = count
        setHunterCount(count)
      },
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
      const delay = hunterCountRef.current > 0 ? SLOW_POLL_MS : FAST_POLL_MS
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

  const reportKill = useCallback(
    (key: TimerKey, killedAt: Date, reporter = playerName) => {
      const record: TimerRecord = {
        killedAt: killedAt.toISOString(),
        updatedAt: new Date().toISOString(),
        reportedBy: reporter.trim() || 'Anonymous',
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
      const record: TimerRecord = {
        killedAt: null,
        updatedAt: new Date().toISOString(),
        reportedBy: reporter.trim() || 'Anonymous',
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

  const partyUrl = room
    ? `${window.location.origin}${window.location.pathname}?board=${encodeURIComponent(encodeRoom(room))}`
    : null

  return {
    board,
    room,
    syncState,
    syncError,
    hunterCount,
    playerName,
    serverId,
    partyUrl,
    updatePlayerName,
    updateServerId,
    reportKill,
    clearTimer,
    clearAllTimers: clearAllTimersOnBoard,
    createSharedBoard,
    importBoard,
    refreshRemote,
    hasReports: hasKillReports(board),
  }
}
