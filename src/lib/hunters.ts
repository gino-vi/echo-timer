export type RemoteHunter = {
  id: string
  name: string
}

export type HunterRow = {
  id: string
  label: string
  anonymous: boolean
  isSelf: boolean
}

export function hunterLabel(name: string): { label: string; anonymous: boolean } {
  const trimmed = name.trim()
  if (!trimmed) {
    return { label: 'Anonymous', anonymous: true }
  }
  return { label: trimmed, anonymous: false }
}

export function listConnectedHunters(selfName: string, remotes: RemoteHunter[]): HunterRow[] {
  const self = hunterLabel(selfName)
  const others = remotes.map((remote) => {
    const display = hunterLabel(remote.name)
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
