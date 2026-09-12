import { joinRoom } from 'trystero'
import type { BoardDoc, LivePayload } from '@/lib/board'
import type { RemotePlayer } from '@/lib/players'

const APP_ID = 'spiritvale-boss-board'

export type LiveChannel = {
  send: (payload: LivePayload) => void
  setName: (name: string) => void
  leave: () => void
}

type LiveHandlers = {
  getBoard: () => BoardDoc
  getName: () => string
  onMessage: (payload: LivePayload) => void
  onPeers: (count: number) => void
  onPlayers: (players: RemotePlayer[]) => void
}

function isLivePayload(value: unknown): value is LivePayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as LivePayload
  return payload.type === 'patch' || payload.type === 'contested' || payload.type === 'snapshot'
}

export function connectLiveRoom(roomId: string, handlers: LiveHandlers): LiveChannel {
  const channel = new BroadcastChannel(`svb-live:${roomId}`)
  channel.onmessage = (event) => {
    if (isLivePayload(event.data)) {
      handlers.onMessage(event.data)
    }
  }

  const names = new Map<string, string>()
  const emitPeers = () => handlers.onPeers(names.size)
  const emitPlayers = () => {
    handlers.onPlayers(
      [...names.entries()].map(([id, name]) => ({ id, name })),
    )
  }

  let localName = handlers.getName()
  let sendRtc: ((payload: LivePayload, target?: string) => void) | null = null
  let sendName: ((name: string, target?: string) => void) | null = null
  let leaveRtc: (() => void) | null = null

  try {
    const room = joinRoom({ appId: APP_ID }, roomId)
    const boardAction = room.makeAction<LivePayload>('board')
    const nameAction = room.makeAction<string>('name')
    sendRtc = (payload, target) => {
      void boardAction.send(payload, target ? { target } : undefined)
    }
    sendName = (name, target) => {
      void nameAction.send(name, target ? { target } : undefined)
    }
    boardAction.onMessage = (payload) => {
      if (isLivePayload(payload)) {
        handlers.onMessage(payload)
      }
    }
    nameAction.onMessage = (value, { peerId }) => {
      names.set(peerId, typeof value === 'string' ? value : '')
      emitPlayers()
    }
    room.onPeerJoin = (peerId) => {
      names.set(peerId, names.get(peerId) ?? '')
      emitPeers()
      emitPlayers()
      sendRtc?.({ type: 'snapshot', board: handlers.getBoard() }, peerId)
      sendName?.(localName, peerId)
    }
    room.onPeerLeave = (peerId) => {
      names.delete(peerId)
      emitPeers()
      emitPlayers()
    }
    leaveRtc = () => {
      void room.leave()
    }
  } catch {
    sendRtc = null
    sendName = null
  }

  return {
    send(payload) {
      channel.postMessage(payload)
      sendRtc?.(payload)
    },
    setName(name) {
      localName = name
      sendName?.(name)
    },
    leave() {
      channel.close()
      leaveRtc?.()
      names.clear()
      emitPeers()
      emitPlayers()
    },
  }
}
