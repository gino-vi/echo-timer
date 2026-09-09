import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/Header'
import { HuntStrip } from '@/components/HuntStrip'
import { BossGrid } from '@/components/BossGrid'
import { LogKillDialog } from '@/components/LogKillDialog'
import { useBoard } from '@/hooks/useBoard'
import { useNow } from '@/hooks/useNow'
import { timerKey } from '@/lib/game'
import { countStatuses, type HuntFilter, type SelectedCell } from '@/lib/view'
import type { BoardDoc } from '@/lib/board'

export default function App() {
  const nowMs = useNow(1000)
  const now = useMemo(() => new Date(nowMs), [nowMs])
  const boardState = useBoard()
  const [filter, setFilter] = useState<HuntFilter>('all')
  const [selected, setSelected] = useState<SelectedCell | null>(null)

  const counts = countStatuses(boardState.board, nowMs, boardState.serverId)

  function handleImport(text: string) {
    const parsed = JSON.parse(text) as BoardDoc
    if (parsed.version !== 1 || typeof parsed.timers !== 'object') {
      throw new Error('Invalid board')
    }
    boardState.importBoard(parsed)
  }

  return (
    <div className="min-h-svh bg-[radial-gradient(1200px_circle_at_top,oklch(0.24_0.04_260),transparent_55%)]">
      <Header
        now={now}
        playerName={boardState.playerName}
        onPlayerNameChange={boardState.updatePlayerName}
        serverId={boardState.serverId}
        onServerChange={boardState.updateServerId}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
        syncState={boardState.syncState}
        syncError={boardState.syncError}
        hunterCount={boardState.hunterCount}
        partyUrl={boardState.partyUrl}
        onCreateBoard={boardState.createSharedBoard}
        onImport={handleImport}
        onClearAll={boardState.clearAllTimers}
        hasReports={boardState.hasReports}
        exportPayload={JSON.stringify(boardState.board, null, 2)}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        <HuntStrip
          board={boardState.board}
          now={nowMs}
          serverId={boardState.serverId}
          onSelect={setSelected}
        />

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-heading text-sm font-medium">Server board</h2>
              <p className="text-xs text-muted-foreground">
                Dead for 60 minutes, then a 1-second to 30-minute spawn window. Click a channel to
                log the tombstone.
              </p>
            </div>
            <div className="hidden text-right text-[11px] tracking-wide text-muted-foreground uppercase sm:block">
              <p>Rose = dead</p>
              <p>Gold = spawn window</p>
              <p>Green = should be up</p>
              <p>Grey = stale</p>
            </div>
          </div>
          <BossGrid
            board={boardState.board}
            serverId={boardState.serverId}
            now={nowMs}
            filter={filter}
            onSelect={setSelected}
          />
        </section>
      </main>

      <LogKillDialog
        open={selected != null}
        target={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onSave={(killedAt) => {
          if (!selected) return
          boardState.reportKill(
            timerKey(selected.bossId, selected.serverId, selected.channel),
            killedAt,
          )
          toast.success('Tombstone time saved')
        }}
        onClear={() => {
          if (!selected) return
          boardState.clearTimer(timerKey(selected.bossId, selected.serverId, selected.channel))
          toast.success('Report cleared')
        }}
      />
    </div>
  )
}
