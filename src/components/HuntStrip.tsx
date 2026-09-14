import { Badge } from '@/components/ui/badge'
import { BOSSES, SERVERS, type ServerId } from '@/lib/game'
import { reportKind, type BoardDoc } from '@/lib/board'
import { formatDuration, formatElapsed } from '@/lib/timers'
import { formatTime } from '@/lib/format'
import { listHuntNow, type HuntPriority } from '@/lib/hunt'
import type { SelectedCell } from '@/lib/view'
import { STATUS_STYLES } from '@/lib/statusStyles'
import { cn } from '@/lib/utils'

type HuntStripProps = {
  board: BoardDoc
  now: number
  serverId: ServerId
  onSelect: (cell: SelectedCell) => void
  onQuickKill: (cell: SelectedCell) => void
  onQuickScout: (cell: SelectedCell) => void
}

const PRIORITY_LABEL: Record<HuntPriority, string> = {
  alive: 'Alive',
  overdue: 'Up?',
  window: 'Window',
  soon: 'Soon',
}

export function HuntStrip({ board, now, serverId, onSelect, onQuickKill, onQuickScout }: HuntStripProps) {
  const actionable = listHuntNow(board, now, serverId)
  const currentServer = SERVERS.find((server) => server.id === serverId)?.full ?? serverId

  return (
    <section className="rounded-xl border border-border/80 bg-card/60 p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-medium">Hunt now</h2>
          <p className="text-xs text-muted-foreground">
            {currentServer} only: alive scouts, should-be-up for 30 minutes, open windows, and
            windows opening in the next 5 minutes. Stale reports stay on the grid, not here.
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
              <button
                key={row.key}
                type="button"
                className={cn(
                  'flex h-auto min-w-44 flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left transition-colors',
                  STATUS_STYLES[row.snap.status],
                )}
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
                onMouseDown={(event) => {
                  if (event.button === 1) event.preventDefault()
                }}
                onPointerDown={(event) => {
                  if (event.button === 1) event.preventDefault()
                }}
                onAuxClick={(event) => {
                  if (event.button !== 1) return
                  event.preventDefault()
                  event.stopPropagation()
                  onQuickScout({
                    bossId: row.bossId,
                    serverId: row.serverId,
                    channel: row.channel,
                  })
                }}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-medium">{boss?.short}</span>
                  <Badge
                    variant="outline"
                    className="border-current/30 bg-black/20 text-inherit"
                  >
                    {PRIORITY_LABEL[row.priority]}
                  </Badge>
                </span>
                <span className="text-xs opacity-80">
                  CH{row.channel}
                  {row.snap.killedAt
                    ? ` · ${reportKind(row.record) === 'scout' ? 'scouted' : 'died'} ${formatTime(row.snap.killedAt)}`
                    : ''}
                </span>
                <span className="text-xs tabular-nums">
                  {row.priority === 'alive'
                    ? `Alive ${formatElapsed(row.snap.msAlive)}`
                    : row.priority === 'overdue'
                      ? `Overdue ${formatDuration(row.snap.msOverdue)}`
                      : row.priority === 'window'
                        ? `Open ${formatElapsed(row.snap.msWindowOpen)}`
                        : `Window in ${formatDuration(row.snap.msUntilWindow)}`}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
