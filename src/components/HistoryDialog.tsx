import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BOSSES, CHANNELS, SERVERS, timerKey, type BossId, type ServerId } from '@/lib/game'
import { reportKind, seedHistory, type BoardDoc } from '@/lib/board'
import { formatLogStamp } from '@/lib/format'

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
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{boss?.name ?? 'Master'} history</DialogTitle>
          <DialogDescription>
            Last five log times on {server?.full ?? serverId} for each channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {CHANNELS.map((channel) => {
            const record = bossId
              ? board.timers[timerKey(bossId, serverId, channel)]
              : undefined
            const entries = seedHistory(record)
            return (
              <section key={channel}>
                <h3 className="text-xs tracking-wide text-muted-foreground uppercase">
                  Channel {channel}
                </h3>
                {entries.length === 0 ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">No logs yet</p>
                ) : (
                  <ol className="mt-1.5 space-y-1.5">
                    {entries.map((entry) => {
                      const at = Date.parse(entry.killedAt)
                      return (
                        <li
                          key={`${entry.killedAt}|${entry.loggedAt}|${reportKind(entry)}`}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm"
                        >
                          <span className="font-medium tabular-nums">
                            {Number.isNaN(at) ? 'Unknown time' : formatLogStamp(at)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {reportKind(entry) === 'scout' ? 'Scouted' : 'Died'}
                            {entry.reportedBy ? ` · ${entry.reportedBy}` : ''}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
