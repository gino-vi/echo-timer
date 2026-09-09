import { useCallback, useEffect, useRef, useState } from 'react'
import {
  decodeRoom,
  encodeRoom,
  mergeBoards,
  randomNamespace,
  setTimer,
  type BoardDoc,
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
import { claimNamespace, fetchBoard, saveBoard } from '@/lib/remoteStore'
import { isServerId, type ServerId } from '@/lib/game'

export type SyncState = 'local' | 'connecting' | 'live' | 'error'

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
  const [playerName, setPlayerNameState] = useState(() => loadPlayerName())
  const [serverId, setServerIdState] = useState<ServerId>(() => {
    const saved = loadServerId()
    return saved && isServerId(saved) ? saved : 'na'
  })

  const boardRef = useRef(board)
  const roomRef = useRef(room)
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
      return
    }
    void refreshRemote()
    const poll = () => {
      if (document.visibilityState === 'hidden') return
      void refreshRemote()
    }
    const id = window.setInterval(poll, 4000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', poll)
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
      enqueuePush(next)
    },
    [enqueuePush, playerName],
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
      enqueuePush(next)
    },
    [enqueuePush, playerName],
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
      enqueuePush(next)
    },
    [enqueuePush],
  )

  const partyUrl = room
    ? `${window.location.origin}${window.location.pathname}?board=${encodeURIComponent(encodeRoom(room))}`
    : null

  return {
    board,
    room,
    syncState,
    syncError,
    playerName,
    serverId,
    partyUrl,
    updatePlayerName,
    updateServerId,
    reportKill,
    clearTimer,
    createSharedBoard,
    importBoard,
    refreshRemote,
  }
}
