export const DEAD_MS = 60 * 60 * 1000
export const SPAWN_WINDOW_MS = 30 * 60 * 1000
/** Earliest possible spawn: 60 minutes + 1 second after the kill. */
export const EARLIEST_SPAWN_MS = DEAD_MS + 1000
/** Latest possible spawn: 60 minutes + 30 minutes after the kill. */
export const LATEST_SPAWN_MS = DEAD_MS + SPAWN_WINDOW_MS

export const BOSSES = [
  { id: 'berserker', name: 'Berserker Master', short: 'Berserker' },
  { id: 'gunslinger', name: 'Gunslinger Master', short: 'Gunslinger' },
  { id: 'necromancer', name: 'Necromancer Master', short: 'Necromancer' },
  { id: 'paladin', name: 'Paladin Master', short: 'Paladin' },
  { id: 'priest', name: 'Priest Master', short: 'Priest' },
  { id: 'shinobi', name: 'Shinobi Master', short: 'Shinobi' },
  { id: 'wizard', name: 'Wizard Master', short: 'Wizard' },
] as const

export const SERVERS = [
  { id: 'na', name: 'NA', full: 'North America' },
  { id: 'eu', name: 'Europe', full: 'Europe' },
  { id: 'asia', name: 'Asia', full: 'Asia' },
  { id: 'sa', name: 'South America', full: 'South America' },
  { id: 'sea', name: 'SEA', full: 'Southeast Asia' },
  { id: 'oce', name: 'OCE', full: 'Oceania' },
] as const

export const CHANNELS = [1, 2, 3] as const

export type BossId = (typeof BOSSES)[number]['id']
export type ServerId = (typeof SERVERS)[number]['id']
export type ChannelId = (typeof CHANNELS)[number]

export function isBossId(value: string): value is BossId {
  return BOSSES.some((boss) => boss.id === value)
}

export function isServerId(value: string): value is ServerId {
  return SERVERS.some((server) => server.id === value)
}

export function isChannelId(value: number): value is ChannelId {
  return CHANNELS.includes(value as ChannelId)
}

export function timerKey(bossId: BossId, serverId: ServerId, channel: ChannelId) {
  return `${bossId}:${serverId}:${channel}` as const
}

export type TimerKey = ReturnType<typeof timerKey>

export function parseTimerKey(key: string): {
  bossId: BossId
  serverId: ServerId
  channel: ChannelId
} | null {
  const [bossId, serverId, channelRaw] = key.split(':')
  const channel = Number(channelRaw)
  if (!isBossId(bossId) || !isServerId(serverId) || !isChannelId(channel)) {
    return null
  }
  return { bossId, serverId, channel }
}
