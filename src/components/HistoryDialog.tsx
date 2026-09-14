import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BOSSES, CHANNELS, SERVERS, timerKey, type BossId, type ServerId } from '@/lib/game'
import { reportKind, seedHistory, type BoardDoc } from '@/lib/board'
import { formatLogDate, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type HistoryDialogProps = {
  bossId: BossId | null
  serverId: ServerId
  board: BoardDoc
  onOpenChange: (open: boolean) => void
}

export function HistoryDialog({ bossId, serverId, board, onOpenChange }: HistoryDialogProps) {
  const boss = BOSSES.find((item) => item.id === bossId)
  const server = SERVERS.find((item) => item.id === serverId)

  return (
    <Dialog open={bossId != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{boss?.name ?? 'Master'} history</DialogTitle>
          <DialogDescription>
            Last five log times on {server?.full ?? serverId} for each channel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {CHANNELS.map((channel) => (
            <div
              key={channel}
              className="px-1 py-1 text-xs tracking-wide text-muted-foreground uppercase"
            >
              Channel {channel}
            </div>
          ))}
          {CHANNELS.map((channel) => {
            const record = bossId
              ? board.timers[timerKey(bossId, serverId, channel)]
              : undefined
            const entries = seedHistory(record)
            return (
              <div key={`logs-${channel}`} className="flex min-w-0 flex-col gap-2">
                {entries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-background/20 px-3 py-2.5 text-sm text-muted-foreground">
                    No logs yet
                  </div>
                ) : (
                  entries.map((entry) => {
                    const at = Date.parse(entry.killedAt)
                    const scouted = reportKind(entry) === 'scout'
                    return (
                      <article
                        key={`${entry.killedAt}|${entry.loggedAt}|${reportKind(entry)}`}
                        className={cn(
                          'flex flex-col gap-0.5 rounded-xl border px-3 py-2.5',
                          scouted
                            ? 'border-lime-400/40 bg-lime-950/50 text-lime-50'
                            : 'border-border/70 bg-card/60',
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-2 text-[11px] tracking-wide uppercase">
                          <span>CH{channel}</span>
                          <span>{scouted ? 'Scouted' : 'Died'}</span>
                        </span>
                        <span className="font-medium">
                          {Number.isNaN(at) ? 'Unknown time' : formatTime(at)}
                        </span>
                        <span className="text-xs opacity-80">
                          {Number.isNaN(at) ? null : formatLogDate(at)}
                          {entry.reportedBy ? ` · ${entry.reportedBy}` : ''}
                        </span>
                      </article>
                    )
                  })
                )}
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
