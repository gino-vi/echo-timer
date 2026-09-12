import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BOSSES, SERVERS } from '@/lib/game'
import type { SelectedCell } from '@/lib/view'
import type { ReportKind } from '@/lib/board'
import { formatTimeInput } from '@/lib/format'

let lastClockInput = ''

function initialClockTime(existingAt: number | null): string {
  if (existingAt != null) return formatTimeInput(existingAt)
  if (lastClockInput) return lastClockInput
  return formatTimeInput()
}

type LogKillDialogProps = {
  open: boolean
  target: SelectedCell | null
  existingAt: number | null
  onOpenChange: (open: boolean) => void
  onSave: (killedAt: Date, kind?: ReportKind) => void
  onClear: () => void
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
  const [clockTime, setClockTime] = useState(() => initialClockTime(existingAt))
  const [error, setError] = useState<string | null>(null)

  const boss = BOSSES.find((item) => item.id === target.bossId)
  const server = SERVERS.find((item) => item.id === target.serverId)

  function saveDate(date: Date | null, kind: ReportKind = 'kill') {
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
    lastClockInput = clockTime
    saveDate(date)
  }

  function onDialogKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.stopPropagation()
    applyClockTime()
  }

  return (
    <div onKeyDownCapture={onDialogKeyDown}>
      <DialogHeader>
        <DialogTitle>Log tombstone time</DialogTitle>
        <DialogDescription>
          {boss?.name} · {server?.full} · Channel {target.channel}. Enter the kill time shown on the
          grave, or mark the boss as scouted alive.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => saveDate(new Date())}>
            Killed just now
          </Button>
          <Button
            type="button"
            size="sm"
            className="border-lime-400/40 bg-lime-600 text-white hover:bg-lime-500"
            onClick={() => saveDate(new Date(), 'scout')}
          >
            Scouted just now
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tombstone-clock">Clock time on the tombstone</Label>
          <div className="flex gap-2">
            <Input
              id="tombstone-clock"
              type="time"
              value={clockTime}
              onChange={(event) => {
                lastClockInput = event.target.value
                setClockTime(event.target.value)
              }}
            />
            <Button type="button" variant="outline" onClick={applyClockTime}>
              Use this time
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            If that clock time has not happened yet today, it is treated as yesterday.
          </p>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <DialogFooter className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onClear()
            onOpenChange(false)
          }}
        >
          Clear report
        </Button>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
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
    ? `${target.bossId}:${target.serverId}:${target.channel}:${String(open)}:${existingAt ?? 'new'}`
    : 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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
