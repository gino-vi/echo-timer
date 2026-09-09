import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BOSSES, SERVERS, type ServerId } from '@/lib/game'
import type { BoardDoc } from '@/lib/board'
import { formatDuration } from '@/lib/timers'
import { formatTime } from '@/lib/format'
import { listHuntNow, type HuntPriority } from '@/lib/hunt'
import type { SelectedCell } from '@/lib/view'

type HuntStripProps = {
  board: BoardDoc
  now: number
  serverId: ServerId
  onSelect: (cell: SelectedCell) => void
  onQuickKill: (cell: SelectedCell) => void
}

const PRIORITY_LABEL: Record<HuntPriority, string> = {
  overdue: 'Up?',
  window: 'Window',
  soon: 'Soon',
}

export function HuntStrip({ board, now, serverId, onSelect, onQuickKill }: HuntStripProps) {
  const actionable = listHuntNow(board, now, serverId)
  const currentServer = SERVERS.find((server) => server.id === serverId)?.full ?? serverId

  return (
    <section className="rounded-xl border border-border/80 bg-card/60 p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-medium">Hunt now</h2>
          <p className="text-xs text-muted-foreground">
            {currentServer} only: should-be-up, open windows, and windows opening in the next 5
            minutes. Stale reports stay on the grid, not here.
          </p>
        </div>
        <Badge variant="outline">{actionable.length} ready</Badge>
      </div>
      {actionable.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to hunt on this server right now. Log a tombstone, or wait until a window is within
          5 minutes.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {actionable.map((row) => {
            const boss = BOSSES.find((item) => item.id === row.bossId)
            return (
              <Button
                key={row.key}
                variant="outline"
                className="h-auto min-w-44 flex-col items-start gap-1 px-3 py-2"
                title="Click for tombstone time. Right-click to log killed now."
                onClick={() =>
                  onSelect({
                    bossId: row.bossId,
                    serverId: row.serverId,
                    channel: row.channel,
                  })
                }
                onContextMenu={(event) => {
                  event.preventDefault()
                  onQuickKill({
                    bossId: row.bossId,
                    serverId: row.serverId,
                    channel: row.channel,
                  })
                }}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-medium">{boss?.short}</span>
                  <Badge variant={row.priority === 'overdue' ? 'default' : 'secondary'}>
                    {PRIORITY_LABEL[row.priority]}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  CH{row.channel}
                  {row.snap.killedAt ? ` · died ${formatTime(row.snap.killedAt)}` : ''}
                </span>
                <span className="text-xs tabular-nums">
                  {row.priority === 'overdue'
                    ? `Overdue ${formatDuration(row.snap.msOverdue)}`
                    : row.priority === 'window'
                      ? `${formatDuration(row.snap.msLeftInWindow)} left`
                      : `Window in ${formatDuration(row.snap.msUntilWindow)}`}
                </span>
              </Button>
            )
          })}
        </div>
      )}
    </section>
  )
}
