import { cn } from '@/lib/utils'
import { formatDuration, spawnSnapshot } from '@/lib/timers'
import { formatTime } from '@/lib/format'
import { killedAtMs, type TimerRecord } from '@/lib/board'
import type { ChannelId } from '@/lib/game'

type TimerCellProps = {
  channel: ChannelId
  record: TimerRecord | undefined
  now: number
  onClick: () => void
  onQuickKill: () => void
  compact?: boolean
}

const STATUS_STYLES = {
  unknown:
    'border-dashed border-border/70 bg-background/20 text-muted-foreground hover:border-primary/40',
  dead: 'border-rose-500/30 bg-rose-950/35 text-rose-50 hover:border-rose-400/50',
  window:
    'border-amber-400/40 bg-amber-950/40 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)] hover:border-amber-300/70',
  overdue:
    'border-emerald-400/40 bg-emerald-950/40 text-emerald-50 hover:border-emerald-300/70',
  stale: 'border-zinc-500/40 bg-zinc-800/70 text-zinc-400 hover:border-zinc-400/50',
}

export function TimerCell({ channel, record, now, onClick, onQuickKill, compact }: TimerCellProps) {
  const snap = spawnSnapshot(killedAtMs(record), now)
  const headline =
    snap.status === 'unknown'
      ? 'No report'
      : snap.status === 'dead'
        ? `Window in ${formatDuration(snap.msUntilWindow)}`
        : snap.status === 'window'
          ? 'Can spawn'
          : snap.status === 'overdue'
            ? 'Should be up'
            : 'Stale report'

  const flavor =
    snap.status === 'window'
      ? `${formatDuration(snap.msLeftInWindow)} until guaranteed spawn`
      : null

  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault()
        onQuickKill()
      }}
      className={cn(
        'flex w-full flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-colors',
        STATUS_STYLES[snap.status],
        compact ? 'gap-0.5' : 'gap-1 min-h-[5.5rem]',
      )}
    >
      <span className="flex w-full items-center justify-between gap-2 text-[11px] tracking-wide uppercase">
        <span>CH{channel}</span>
        {snap.status !== 'unknown' ? <span>{snap.status}</span> : <span>Log kill</span>}
      </span>
      <span className={cn('font-medium', compact ? 'text-sm' : 'text-[0.95rem]')}>{headline}</span>
      {flavor ? <span className="text-xs opacity-90">{flavor}</span> : null}
      {snap.killedAt ? (
        <span className="text-xs opacity-80">
          Died {formatTime(snap.killedAt)}
          {record?.reportedBy ? ` · ${record.reportedBy}` : ''}
        </span>
      ) : (
        <span className="text-xs opacity-70">Click for a time, or right-click to log now</span>
      )}
    </button>
  )
}
