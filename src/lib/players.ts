export type RemotePlayer = {
  id: string
  name: string
}

export type PlayerRow = {
  id: string
  label: string
  anonymous: boolean
  isSelf: boolean
}

export function playerLabel(name: string): { label: string; anonymous: boolean } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { label: 'Anonymous', anonymous: true }
  }
  return { label: trimmed, anonymous: false }
}

export function listConnectedPlayers(selfName: string, remotes: RemotePlayer[]): PlayerRow[] {
  const self = playerLabel(selfName)
  const others = remotes.map((remote) => {
    const display = playerLabel(remote.name)
    return {
      id: remote.id,
      label: display.label,
      anonymous: display.anonymous,
      isSelf: false,
    }
  })
  others.sort((a, b) => {
    if (a.anonymous !== b.anonymous) return a.anonymous ? 1 : -1
    return a.label.localeCompare(b.label)
  })
  return [
    { id: 'self', label: self.label, anonymous: self.anonymous, isSelf: true },
    ...others,
  ]
}
