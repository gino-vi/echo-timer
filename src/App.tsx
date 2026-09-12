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
import { killedAtMs, type BoardDoc } from '@/lib/board'
import { loadHuntNowVisible, saveHuntNowVisible } from '@/lib/localStore'

export default function App() {
  const nowMs = useNow(1000)
  const now = useMemo(() => new Date(nowMs), [nowMs])
  const boardState = useBoard()
  const [filter, setFilter] = useState<HuntFilter>('all')
  const [selected, setSelected] = useState<SelectedCell | null>(null)
  const [huntNowVisible, setHuntNowVisible] = useState(() => loadHuntNowVisible())

  const counts = countStatuses(boardState.board, nowMs, boardState.serverId)

  function logKilledNow(cell: SelectedCell) {
    boardState.reportKill(timerKey(cell.bossId, cell.serverId, cell.channel), new Date())
    toast.success('Logged as killed now')
  }

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
        playerCount={boardState.playerCount}
        remotePlayers={boardState.remotePlayers}
        partyUrl={boardState.partyUrl}
        onCreateBoard={boardState.createSharedBoard}
        onLeaveBoard={boardState.leaveBoard}
        onImport={handleImport}
        onClearAll={boardState.clearAllTimers}
        hasReports={boardState.hasReports}
        exportPayload={JSON.stringify(boardState.board, null, 2)}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
        {huntNowVisible ? (
          <HuntStrip
            board={boardState.board}
            now={nowMs}
            serverId={boardState.serverId}
            onSelect={setSelected}
            onQuickKill={logKilledNow}
          />
        ) : null}

        <section className="space-y-3">
          <div>
            <h2 className="font-heading text-sm font-medium">Server board</h2>
            <p className="text-xs text-muted-foreground">
              Dead for 60 minutes, then a 1-second to 30-minute spawn window.{' '}
              <button
                type="button"
                className="text-xs text-foreground underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground"
                onClick={() => {
                  const next = !huntNowVisible
                  setHuntNowVisible(next)
                  saveHuntNowVisible(next)
                }}
              >
                {huntNowVisible ? 'Hide Hunt now' : 'Show Hunt now'}
              </button>
            </p>
          </div>
          <BossGrid
            board={boardState.board}
            serverId={boardState.serverId}
            now={nowMs}
            filter={filter}
            onSelect={setSelected}
            onQuickKill={logKilledNow}
            onToggleContested={(channel) =>
              boardState.toggleContested(boardState.serverId, channel)
            }
          />
        </section>
      </main>

      <LogKillDialog
        open={selected != null}
        target={selected}
        existingAt={
          selected
            ? killedAtMs(
                boardState.board.timers[
                  timerKey(selected.bossId, selected.serverId, selected.channel)
                ],
              )
            : null
        }
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        onSave={(killedAt, kind = 'kill') => {
          if (!selected) return
          boardState.reportKill(
            timerKey(selected.bossId, selected.serverId, selected.channel),
            killedAt,
            boardState.playerName,
            kind,
          )
          toast.success(kind === 'scout' ? 'Scouted as alive' : 'Tombstone time saved')
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
