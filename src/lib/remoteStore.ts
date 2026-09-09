import { emptyBoard, type BoardDoc, type Room } from '@/lib/board'

const BASE = 'https://mantledb.sh/v2'

async function errorMessage(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return `${res.status} ${res.statusText}`
  try {
    const json = JSON.parse(text) as { error?: string; message?: string }
    return json.error || json.message || text
  } catch {
    return text.slice(0, 180)
  }
}

export async function claimNamespace(ns: string): Promise<string> {
  const res = await fetch(`${BASE}/claim/${encodeURIComponent(ns)}`)
  if (!res.ok) {
    throw new Error(`Could not create a shared board: ${await errorMessage(res)}`)
  }
  const data = (await res.json()) as { key?: string }
  if (!data.key) {
    throw new Error('Shared board was created without a key.')
  }
  return data.key
}

export async function fetchBoard(room: Room): Promise<BoardDoc | null> {
  const res = await fetch(`${BASE}/${encodeURIComponent(room.ns)}/board`, {
    headers: { 'X-Mantle-Key': room.key },
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Could not load the shared board: ${await errorMessage(res)}`)
  }
  const data = (await res.json()) as BoardDoc
  if (!data || data.version !== 1 || typeof data.timers !== 'object') {
    return emptyBoard()
  }
  return data
}

export async function saveBoard(room: Room, board: BoardDoc): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(room.ns)}/board`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Mantle-Key': room.key,
    },
    body: JSON.stringify(board),
  })
  if (!res.ok) {
    throw new Error(`Could not save the shared board: ${await errorMessage(res)}`)
  }
}
