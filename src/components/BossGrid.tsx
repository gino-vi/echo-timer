import { BOSSES, CHANNELS, timerKey, type ServerId } from '@/lib/game'
import type { BoardDoc } from '@/lib/board'
import { spawnSnapshot } from '@/lib/timers'
import { killedAtMs } from '@/lib/board'
import { TimerCell } from '@/components/TimerCell'
import type { HuntFilter, SelectedCell } from '@/lib/view'
import { matchesFilter } from '@/lib/view'

type BossGridProps = {
  board: BoardDoc
  serverId: ServerId
  now: number
  filter: HuntFilter
  onSelect: (cell: SelectedCell) => void
  onQuickKill: (cell: SelectedCell) => void
}

export function BossGrid({ board, serverId, now, filter, onSelect, onQuickKill }: BossGridProps) {
  const rows = BOSSES.map((boss) => {
    const cells = CHANNELS.map((channel) => {
      const key = timerKey(boss.id, serverId, channel)
      const record = board.timers[key]
      const status = spawnSnapshot(killedAtMs(record), now).status
      return { channel, record, status }
    })
    const visible = cells.some((cell) => matchesFilter(cell.status, filter))
    return { boss, cells, visible }
  }).filter((row) => row.visible)

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
        <p className="font-heading text-sm">Nothing in this filter</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Switch filters or log a tombstone time on another channel.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[44rem] grid-cols-[11rem_repeat(3,minmax(0,1fr))] gap-2">
          <div className="px-1 py-2 text-xs tracking-wide text-muted-foreground uppercase">
            Master
          </div>
          {CHANNELS.map((channel) => (
            <div
              key={channel}
              className="px-1 py-2 text-xs tracking-wide text-muted-foreground uppercase"
            >
              Channel {channel}
            </div>
          ))}
          {rows.map(({ boss, cells }) => (
            <div key={boss.id} className="contents">
              <div className="flex flex-col justify-center rounded-xl border border-border/70 bg-card/50 px-3 py-3">
                <p className="font-heading text-sm font-medium">{boss.short}</p>
                <p className="text-xs text-muted-foreground">{boss.name}</p>
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
            <h3 className="font-heading text-sm font-medium">{boss.name}</h3>
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
  )
}
