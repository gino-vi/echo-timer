import { useState } from 'react'
import { BOSSES, CHANNELS, timerKey, type BossId, type ChannelId, type ServerId } from '@/lib/game'
import { spawnFromRecord } from '@/lib/timers'
import { getContested, type BoardDoc } from '@/lib/board'
import { TimerCell } from '@/components/TimerCell'
import { HistoryDialog } from '@/components/HistoryDialog'
import type { HuntFilter, SelectedCell } from '@/lib/view'
import { matchesFilter } from '@/lib/view'
import { cn } from '@/lib/utils'

type BossGridProps = {
  board: BoardDoc
  serverId: ServerId
  now: number
  filter: HuntFilter
  onSelect: (cell: SelectedCell) => void
  onQuickKill: (cell: SelectedCell) => void
  onToggleContested: (channel: ChannelId) => void
}

function ContestedButton({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
      className={cn(
        'inline-flex h-7 shrink-0 cursor-pointer items-center rounded-md text-[11px] font-medium tracking-wide select-none transition-colors',
        on
          ? 'border border-red-500 bg-red-600 px-2.5 text-white'
          : 'border-0 bg-transparent px-0 text-muted-foreground hover:text-foreground',
      )}
    >
      {on ? 'CONTESTED' : 'Contested'}
    </button>
  )
}

export function BossGrid({
  board,
  serverId,
  now,
  filter,
  onSelect,
  onQuickKill,
  onToggleContested,
}: BossGridProps) {
  const [historyBossId, setHistoryBossId] = useState<BossId | null>(null)
  const rows = BOSSES.map((boss) => {
    const cells = CHANNELS.map((channel) => {
      const key = timerKey(boss.id, serverId, channel)
      const record = board.timers[key]
      const status = spawnFromRecord(record, now).status
      return { channel, record, status }
    })
    const visible = cells.some((cell) => matchesFilter(cell.status, filter))
    return { boss, cells, visible }
  }).filter((row) => row.visible)

  const channelHeaders = CHANNELS.map((channel) => ({
    channel,
    on: getContested(board, serverId, channel),
  }))

  return (
    <>
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {channelHeaders.map(({ channel, on }) => (
          <div key={channel} className="flex items-center gap-1.5 py-2 pl-2">
            <span className="min-w-0 flex-1 truncate text-[10px] tracking-wide text-muted-foreground uppercase">
              Channel {channel}
            </span>
            <ContestedButton on={on} onToggle={() => onToggleContested(channel)} />
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <p className="font-heading text-sm">Nothing in this filter</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Switch filters or log a tombstone time on another channel.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <div className="grid min-w-[44rem] grid-cols-[11rem_repeat(3,minmax(0,1fr))] gap-2">
              <div className="px-1 py-2 text-xs tracking-wide text-muted-foreground uppercase">
                Master
              </div>
              {channelHeaders.map(({ channel, on }) => (
                <div key={channel} className="flex items-center gap-2 py-2 pl-3">
                  <span className="min-w-0 flex-1 truncate text-xs tracking-wide text-muted-foreground uppercase">
                    Channel {channel}
                  </span>
                  <ContestedButton on={on} onToggle={() => onToggleContested(channel)} />
                </div>
              ))}
              {rows.map(({ boss, cells }) => (
                <div key={boss.id} className="contents">
                  <div className="flex flex-col justify-center rounded-xl border border-border/70 bg-card/50 px-3 py-3">
                    <p className="font-heading text-sm font-medium">{boss.short}</p>
                    <p className="text-xs text-muted-foreground">{boss.name}</p>
                    <button
                      type="button"
                      className="mt-2 w-fit text-xs text-muted-foreground italic hover:text-foreground"
                      onClick={() => setHistoryBossId(boss.id)}
                    >
                      History
                    </button>
                  </div>
                  {cells.map((cell) => (
                    <TimerCell
                      key={`${boss.id}-${cell.channel}`}
                      channel={cell.channel}
                      record={cell.record}
                      now={now}
                      onClick={() =>
                        onSelect({ bossId: boss.id, serverId, channel: cell.channel })
                      }
                      onQuickKill={() =>
                        onQuickKill({ bossId: boss.id, serverId, channel: cell.channel })
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map(({ boss, cells }) => (
              <article key={boss.id} className="rounded-xl border border-border/80 bg-card/50 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-heading text-sm font-medium">{boss.name}</h3>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground italic hover:text-foreground"
                    onClick={() => setHistoryBossId(boss.id)}
                  >
                    History
                  </button>
                </div>
                <div className="mt-2 grid gap-2">
                  {cells.map((cell) => (
                    <TimerCell
                      key={`${boss.id}-${cell.channel}`}
                      channel={cell.channel}
                      record={cell.record}
                      now={now}
                      compact
                      onClick={() =>
                        onSelect({ bossId: boss.id, serverId, channel: cell.channel })
                      }
                      onQuickKill={() =>
                        onQuickKill({ bossId: boss.id, serverId, channel: cell.channel })
                      }
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      <HistoryDialog
        bossId={historyBossId}
        serverId={serverId}
        board={board}
        onOpenChange={(open) => {
          if (!open) setHistoryBossId(null)
        }}
      />
    </>
  )
}
