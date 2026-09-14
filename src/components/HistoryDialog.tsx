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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{boss?.name ?? 'Master'} history</DialogTitle>
          <DialogDescription>
            Last five log times on {server?.full ?? serverId} for each channel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          {CHANNELS.map((channel) => (
            <div
              key={`head-${channel}`}
              className="text-xs tracking-wide text-muted-foreground uppercase"
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
              <section key={`logs-${channel}`} className="min-w-0">
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logs yet</p>
                ) : (
                  <ol className="space-y-2">
                    {entries.map((entry) => {
                      const at = Date.parse(entry.killedAt)
                      return (
                        <li
                          key={`${entry.killedAt}|${entry.loggedAt}|${reportKind(entry)}`}
                          className="text-sm"
                        >
                          <p className="font-medium tabular-nums">
                            {Number.isNaN(at) ? 'Unknown time' : formatLogStamp(at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reportKind(entry) === 'scout' ? 'Scouted' : 'Died'}
                            {entry.reportedBy ? ` · ${entry.reportedBy}` : ''}
                          </p>
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
