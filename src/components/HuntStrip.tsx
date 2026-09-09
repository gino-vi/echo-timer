import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BOSSES, SERVERS, parseTimerKey, type ChannelId, type ServerId } from '@/lib/game'
import { killedAtMs, type BoardDoc } from '@/lib/board'
import { formatDuration, spawnSnapshot } from '@/lib/timers'
import { formatTime } from '@/lib/format'
import type { SelectedCell } from '@/lib/view'

type HuntStripProps = {
  board: BoardDoc
  now: number
  serverId: ServerId
  onSelect: (cell: SelectedCell) => void
}

export function HuntStrip({ board, now, serverId, onSelect }: HuntStripProps) {
  const actionable = Object.entries(board.timers)
    .map(([key, record]) => {
      const parsed = parseTimerKey(key)
      if (!parsed) return null
      const snap = spawnSnapshot(killedAtMs(record), now)
      if (snap.status !== 'window' && snap.status !== 'overdue') return null
      if (parsed.serverId !== serverId && snap.status !== 'overdue' && snap.status !== 'window') {
        return null
      }
      return { key, ...parsed, record, snap }
    })
    .filter((row) => row != null)
    .sort((a, b) => {
      if (a.snap.status !== b.snap.status) {
        return a.snap.status === 'overdue' ? -1 : 1
      }
      if (a.serverId === serverId && b.serverId !== serverId) return -1
      if (b.serverId === serverId && a.serverId !== serverId) return 1
      return a.snap.msLeftInWindow - b.snap.msLeftInWindow
    })
    .slice(0, 8)

  const currentServer = SERVERS.find((server) => server.id === serverId)?.full ?? serverId

  return (
    <section className="rounded-xl border border-border/80 bg-card/60 p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-medium">Hunt now</h2>
          <p className="text-xs text-muted-foreground">
            Spawn windows and overdue masters, with {currentServer} listed first.
          </p>
        </div>
        <Badge variant="outline">{actionable.length} ready</Badge>
      </div>
      {actionable.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open windows yet. Log a tombstone to start a 60-minute lock, then the 30-minute spawn
          window.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actionable.map((row) => {
            const boss = BOSSES.find((item) => item.id === row.bossId)
            const server = SERVERS.find((item) => item.id === row.serverId)
            return (
              <Button
                key={row.key}
                variant="outline"
                className="h-auto min-w-44 flex-col items-start gap-1 px-3 py-2"
                onClick={() =>
                  onSelect({
                    bossId: row.bossId,
                    serverId: row.serverId,
                    channel: row.channel as ChannelId,
                  })
                }
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-medium">{boss?.short}</span>
                  <Badge variant={row.snap.status === 'overdue' ? 'default' : 'secondary'}>
                    {row.snap.status === 'overdue' ? 'Up?' : 'Window'}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {server?.name} · CH{row.channel}
                  {row.snap.killedAt ? ` · died ${formatTime(row.snap.killedAt)}` : ''}
                </span>
                <span className="text-xs tabular-nums">
                  {row.snap.status === 'overdue'
                    ? `Overdue ${formatDuration(row.snap.msOverdue)}`
                    : `${formatDuration(row.snap.msLeftInWindow)} left`}
                </span>
              </Button>
            )
          })}
        </div>
      )}
    </section>
  )
}
