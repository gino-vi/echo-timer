import { useEffect, useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { BOSSES, SERVERS } from '@/lib/game'
import type { SelectedCell } from '@/lib/view'
import type { ReportKind } from '@/lib/board'
import { preferredClockTime } from '@/lib/format'
import { loadLastClockInput, saveLastClockInput } from '@/lib/localStore'

type LogKillDialogProps = {
  open: boolean
  target: SelectedCell | null
  existingAt: number | null
  onOpenChange: (open: boolean) => void
  onSave: (killedAt: Date, kind?: ReportKind) => void
  onClear: () => void
}

function rememberClock(value: string) {
  saveLastClockInput(value)
}

function KillForm({
  target,
  existingAt,
  onOpenChange,
  onSave,
  onClear,
}: {
  target: SelectedCell
  existingAt: number | null
  onOpenChange: (open: boolean) => void
  onSave: (killedAt: Date, kind?: ReportKind) => void
  onClear: () => void
}) {
  const [clockTime, setClockTime] = useState(() =>
    preferredClockTime(loadLastClockInput(), existingAt),
  )
  const [error, setError] = useState<string | null>(null)

  const boss = BOSSES.find((item) => item.id === target.bossId)
  const server = SERVERS.find((item) => item.id === target.serverId)

  useEffect(() => {
    return () => {
      rememberClock(clockTime)
    }
  }, [clockTime])

  function updateClock(value: string) {
    rememberClock(value)
    setClockTime(value)
  }

  function saveDate(date: Date | null, kind: ReportKind = 'kill') {
    rememberClock(clockTime)
    if (!date) {
      setError('Enter a valid kill time.')
      return
    }
    if (date.getTime() > Date.now() + 60_000) {
      setError('That time is in the future. Tombstone times should already have happened.')
      return
    }
    onSave(date, kind)
    onOpenChange(false)
  }

  function applyClockTime() {
    if (!clockTime) {
      setError('Enter the clock time from the tombstone.')
      return
    }
    const [hoursRaw, minutesRaw] = clockTime.split(':')
    const hours = Number(hoursRaw)
    const minutes = Number(minutesRaw)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      setError('Could not read that clock time.')
      return
    }
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    if (date.getTime() > Date.now() + 60_000) {
      date.setDate(date.getDate() - 1)
    }
    rememberClock(clockTime)
    saveDate(date)
  }

  function onDialogKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.stopPropagation()
    applyClockTime()
  }

  return (
    <div className="flex flex-col" onKeyDownCapture={onDialogKeyDown}>
      <DialogHeader className="gap-1.5">
        <DialogTitle>Log tombstone time</DialogTitle>
        <DialogDescription>
          {boss?.name} · {server?.full} · Channel {target.channel}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" className="h-9" onClick={() => saveDate(new Date())}>
          Killed just now
        </Button>
        <Button
          type="button"
          className="h-9 border-lime-400/40 bg-lime-600 text-white hover:bg-lime-500"
          onClick={() => saveDate(new Date(), 'scout')}
        >
          Scouted just now
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium">Tombstone clock</p>
        <div className="grid grid-cols-[1fr_auto] items-stretch gap-2">
          <Input
            id="tombstone-clock"
            type="time"
            aria-label="Tombstone clock"
            className="h-9"
            value={clockTime}
            onChange={(event) => updateClock(event.target.value)}
            onInput={(event) => updateClock((event.target as HTMLInputElement).value)}
          />
          <Button type="button" variant="outline" className="h-9 px-3" onClick={applyClockTime}>
            Use this time
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If that clock time has not happened yet today, it is treated as yesterday.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <div className="-mx-4 -mb-4 mt-4 grid grid-cols-2 gap-2 rounded-b-xl border-t bg-muted/50 p-4">
        <Button
          type="button"
          variant="ghost"
          className="h-9"
          onClick={() => {
            rememberClock(clockTime)
            onClear()
            onOpenChange(false)
          }}
        >
          Clear report
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={() => {
            rememberClock(clockTime)
            onOpenChange(false)
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function LogKillDialog({
  open,
  target,
  existingAt,
  onOpenChange,
  onSave,
  onClear,
}: LogKillDialogProps) {
  const formKey = target
    ? `${target.bossId}:${target.serverId}:${target.channel}:${String(open)}`
    : 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {target ? (
          <KillForm
            key={formKey}
            target={target}
            existingAt={existingAt}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onClear={onClear}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
