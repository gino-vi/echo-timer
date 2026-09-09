import { joinRoom } from 'trystero'
import type { BoardDoc, LivePayload } from '@/lib/board'

const APP_ID = 'spiritvale-boss-board'

export type LiveChannel = {
  send: (payload: LivePayload) => void
  leave: () => void
}

type LiveHandlers = {
  getBoard: () => BoardDoc
  onMessage: (payload: LivePayload) => void
  onPeers: (count: number) => void
}

function isLivePayload(value: unknown): value is LivePayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as LivePayload
  return payload.type === 'patch' || payload.type === 'snapshot'
}

export function connectLiveRoom(roomId: string, handlers: LiveHandlers): LiveChannel {
  const channel = new BroadcastChannel(`svb-live:${roomId}`)
  channel.onmessage = (event) => {
    if (isLivePayload(event.data)) {
      handlers.onMessage(event.data)
    }
  }

  const peers = new Set<string>()
  const emitPeers = () => handlers.onPeers(peers.size)

  let sendRtc: ((payload: LivePayload, target?: string) => void) | null = null
  let leaveRtc: (() => void) | null = null

  try {
    const room = joinRoom({ appId: APP_ID }, roomId)
    const action = room.makeAction<LivePayload>('board')
    sendRtc = (payload, target) => {
      void action.send(payload, target ? { target } : undefined)
    }
    action.onMessage = (payload) => {
      if (isLivePayload(payload)) {
        handlers.onMessage(payload)
      }
    }
    room.onPeerJoin = (peerId) => {
      peers.add(peerId)
      emitPeers()
      sendRtc?.({ type: 'snapshot', board: handlers.getBoard() }, peerId)
    }
    room.onPeerLeave = (peerId) => {
      peers.delete(peerId)
      emitPeers()
    }
    leaveRtc = () => {
      void room.leave()
    }
  } catch {
    sendRtc = null
  }

  return {
    send(payload) {
      channel.postMessage(payload)
      sendRtc?.(payload)
    },
    leave() {
      channel.close()
      leaveRtc?.()
      peers.clear()
      emitPeers()
    },
  }
}
