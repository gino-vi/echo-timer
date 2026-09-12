import { emptyBoard, type BoardDoc, type Room } from '@/lib/board'

const BOARD_KEY = 'svb:board'
const ROOM_KEY = 'svb:room'
const NAME_KEY = 'svb:player-name'
const SERVER_KEY = 'svb:server'
const CLOCK_KEY = 'svb:last-clock'

export function loadLocalBoard(): BoardDoc {
  try {
    const raw = localStorage.getItem(BOARD_KEY)
    if (!raw) return emptyBoard()
    const parsed = JSON.parse(raw) as BoardDoc
    if (parsed.version !== 1 || typeof parsed.timers !== 'object' || !parsed.timers) {
      return emptyBoard()
    }
    return parsed
  } catch {
    return emptyBoard()
  }
}

export function saveLocalBoard(board: BoardDoc) {
  localStorage.setItem(BOARD_KEY, JSON.stringify(board))
}

export function loadLocalRoom(): Room | null {
  try {
    const raw = localStorage.getItem(ROOM_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Room
    if (!parsed.ns || !parsed.key) return null
    return parsed
  } catch {
    return null
  }
}

export function saveLocalRoom(room: Room | null) {
  if (!room) {
    localStorage.removeItem(ROOM_KEY)
    return
  }
  localStorage.setItem(ROOM_KEY, JSON.stringify(room))
}

export function loadPlayerName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function savePlayerName(name: string) {
  localStorage.setItem(NAME_KEY, name)
}

export function loadServerId(): string | null {
  return localStorage.getItem(SERVER_KEY)
}

export function saveServerId(id: string) {
  localStorage.setItem(SERVER_KEY, id)
}

export function loadLastClockInput(): string {
  try {
    return localStorage.getItem(CLOCK_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveLastClockInput(value: string) {
  if (!value) return
  try {
    localStorage.setItem(CLOCK_KEY, value)
  } catch {
    // Ignore quota / private-mode failures; in-memory fallback still works.
  }
}
