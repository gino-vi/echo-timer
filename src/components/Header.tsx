import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { HuntFilter } from '@/lib/view'
import { SERVERS, type ServerId } from '@/lib/game'
import { formatClock, timezoneLabel } from '@/lib/format'
import type { SyncState } from '@/hooks/useBoard'
import { listConnectedPlayers, type RemotePlayer } from '@/lib/players'
import { cn } from '@/lib/utils'
import { Link2, Loader2, LogOut, Share2, Trash2, Upload } from 'lucide-react'

const FILTERS: { id: HuntFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'alive', label: 'Alive' },
  { id: 'window', label: 'Can spawn' },
  { id: 'overdue', label: 'Should be up' },
  { id: 'stale', label: 'Stale' },
  { id: 'dead', label: 'Dead' },
  { id: 'unknown', label: 'No report' },
]

type HeaderProps = {
  now: Date
  playerName: string
  onPlayerNameChange: (name: string) => void
  serverId: ServerId
  onServerChange: (id: ServerId) => void
  filter: HuntFilter
  onFilterChange: (filter: HuntFilter) => void
  counts: Record<string, number>
  syncState: SyncState
  syncError: string | null
  playerCount: number
  remotePlayers: RemotePlayer[]
  partyUrl: string | null
  onCreateBoard: () => Promise<string>
  onLeaveBoard: () => void
  onImport: (text: string) => void
  onClearAll: () => void
  hasReports: boolean
  exportPayload: string
}

export function Header({
  now,
  playerName,
  onPlayerNameChange,
  serverId,
  onServerChange,
  filter,
  onFilterChange,
  counts,
  syncState,
  syncError,
  playerCount,
  remotePlayers,
  partyUrl,
  onCreateBoard,
  onLeaveBoard,
  onImport,
  onClearAll,
  hasReports,
  exportPayload,
}: HeaderProps) {
  const [shareOpen, setShareOpen] = useState(false)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [importText, setImportText] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!confirmClear) return
    const id = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(id)
  }, [confirmClear])

  const players = listConnectedPlayers(playerName, remotePlayers)

  async function copyPartyLink() {
    try {
      let url = partyUrl
      if (!url) {
        setCreating(true)
        url = `${window.location.origin}${window.location.pathname}?board=${await onCreateBoard()}`
      }
      await navigator.clipboard.writeText(url)
      toast.success('Party link copied. Keep this URL open — kills show up live for everyone using it.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create a party link')
    } finally {
      setCreating(false)
    }
  }

  function applyImport() {
    try {
      onImport(importText)
      setImportText('')
      toast.success('Imported timer reports')
    } catch {
      toast.error('That JSON is not a valid board export')
    }
  }

  return (
    <header className="border-b border-border/80 bg-[linear-gradient(180deg,oklch(0.21_0.03_260),oklch(0.17_0.025_260))]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-[0.22em] text-primary/80 uppercase">
              SpiritVale
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              Echo Master Boss Board
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Shared timers for the seven class masters across every server and channel.
              All countdowns use this computer&apos;s clock.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-8 items-center gap-2 rounded-lg border border-primary/20 bg-background/40 px-3">
              <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                Local time · {timezoneLabel(now)}
              </p>
              <p className="font-heading text-sm font-medium tabular-nums">{formatClock(now)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Input
                value={playerName}
                onChange={(event) => onPlayerNameChange(event.target.value)}
                placeholder="Your player name"
                aria-label="Player name"
                className="h-8 w-full sm:w-48"
              />
              <Button onClick={() => setShareOpen(true)}>
                <Share2 data-icon="inline-start" />
                Share board
              </Button>
              {partyUrl ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    onLeaveBoard()
                    setShareOpen(false)
                    toast.success('Left the shared board')
                  }}
                >
                  <LogOut data-icon="inline-start" />
                  Leave board
                </Button>
              ) : null}
              <Button
                variant={confirmClear ? 'destructive' : 'outline'}
                disabled={!hasReports && !confirmClear}
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true)
                    return
                  }
                  onClearAll()
                  setConfirmClear(false)
                  toast.success('All reported timers cleared')
                }}
              >
                <Trash2 data-icon="inline-start" />
                {confirmClear ? 'Click again to confirm' : 'Clear all timers'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {syncState === 'live' ? (
              <button
                type="button"
                className={cn(badgeVariants({ variant: 'default' }), 'cursor-pointer')}
                onClick={() => setPlayersOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={playersOpen}
              >
                {playerCount > 0 ? `Live · ${playerCount + 1} players` : 'Live board'}
              </button>
            ) : (
              <Badge variant="outline">
                {syncState === 'connecting' && <Loader2 className="animate-spin" />}
                {syncState === 'local' && 'Local only'}
                {syncState === 'connecting' && 'Connecting'}
                {syncState === 'error' && 'Sync issue'}
              </Badge>
            )}
            {syncError ? (
              <p className="text-xs text-destructive">{syncError}</p>
            ) : syncState === 'local' ? (
              <p className="text-xs text-muted-foreground">
                Not live yet. Share a party link so Asia and NA reports update instantly for everyone.
              </p>
            ) : playerCount > 0 ? (
              <p className="text-xs text-muted-foreground">
                Click Live to see who is connected. New tombstones show up immediately.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Kills from anyone on this party link show up immediately. Leave the tab open while you hunt.
              </p>
            )}
          </div>

          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {SERVERS.map((server) => (
              <Button
                key={server.id}
                size="sm"
                variant={serverId === server.id ? 'default' : 'outline'}
                onClick={() => onServerChange(server.id)}
              >
                {server.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                size="xs"
                variant={filter === item.id ? 'secondary' : 'ghost'}
                onClick={() => onFilterChange(item.id)}
              >
                {item.label}
                {item.id !== 'all' ? (
                  <span className="tabular-nums text-muted-foreground">{counts[item.id] ?? 0}</span>
                ) : null}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={playersOpen} onOpenChange={setPlayersOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Players on this board</DialogTitle>
            <DialogDescription>
              Everyone currently connected to this party link.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-1.5"
              >
                {player.anonymous ? (
                  <em className="text-sm italic [font-style:oblique_10deg] font-normal">
                    Anonymous
                  </em>
                ) : (
                  <span className="text-sm font-medium">{player.label}</span>
                )}
                {player.isSelf ? (
                  <span className="text-xs text-muted-foreground">you</span>
                ) : null}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share this board</DialogTitle>
            <DialogDescription>
              Everyone must open and keep this same link. New tombstone times are pushed to the party
              immediately. JSON import is a one-time backup, not live sync.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="party-link">Party link</Label>
              <div className="flex gap-2">
                <Input
                  id="party-link"
                  readOnly
                  value={partyUrl ?? 'Create a shared board to get a link'}
                />
                <Button onClick={() => void copyPartyLink()} disabled={creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <Link2 />}
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-json">Backup JSON</Label>
              <textarea
                id="export-json"
                readOnly
                value={exportPayload}
                className="h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs"
              />
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(exportPayload)
                  toast.success('Board JSON copied')
                }}
              >
                Copy JSON
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-json">Import JSON</Label>
              <textarea
                id="import-json"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste a board export to merge a backup. This does not subscribe you to live updates."
                className="h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs"
              />
              <Button variant="outline" onClick={applyImport} disabled={!importText.trim()}>
                <Upload data-icon="inline-start" />
                Merge import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
