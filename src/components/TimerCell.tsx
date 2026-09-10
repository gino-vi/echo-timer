import { cn } from '@/lib/utils'
import { formatDuration, formatElapsed, spawnFromRecord } from '@/lib/timers'
import { formatTime } from '@/lib/format'
import { reportKind, type TimerRecord } from '@/lib/board'
import type { ChannelId } from '@/lib/game'
import { STATUS_STYLES } from '@/lib/statusStyles'

type TimerCellProps = {
  channel: ChannelId
  record: TimerRecord | undefined
  now: number
  onClick: () => void
  onQuickKill: () => void
  compact?: boolean
}

export function TimerCell({ channel, record, now, onClick, onQuickKill, compact }: TimerCellProps) {
  const snap = spawnFromRecord(record, now)
  const scouted = reportKind(record) === 'scout'
  const headline =
    snap.status === 'unknown'
      ? 'No report'
      : snap.status === 'dead'
        ? `Window in ${formatDuration(snap.msUntilWindow)}`
        : snap.status === 'window'
          ? 'Can spawn'
          : snap.status === 'overdue'
            ? 'Should be up'
            : snap.status === 'alive'
              ? 'Alive'
              : 'Stale report'

  const flavor =
    snap.status === 'window'
      ? `${formatDuration(snap.msLeftInWindow)} until guaranteed spawn`
      : snap.status === 'alive'
        ? `Scouted ${formatElapsed(snap.msAlive)}`
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
          {scouted ? 'Scouted' : 'Died'} {formatTime(snap.killedAt)}
          {record?.reportedBy ? ` · ${record.reportedBy}` : ''}
        </span>
      ) : (
        <span className="text-xs opacity-70">Click for a time, or right-click to log now</span>
      )}
    </button>
  )
}
