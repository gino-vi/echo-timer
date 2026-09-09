import { useState } from 'react'
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

type LogKillDialogProps = {
  open: boolean
  target: SelectedCell | null
  onOpenChange: (open: boolean) => void
  onSave: (killedAt: Date) => void
  onClear: () => void
}

function freshClockTime() {
  const current = new Date()
  return `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`
}

function KillForm({
  target,
  onOpenChange,
  onSave,
  onClear,
}: {
  target: SelectedCell
  onOpenChange: (open: boolean) => void
  onSave: (killedAt: Date) => void
  onClear: () => void
}) {
  const [minutesAgo, setMinutesAgo] = useState('5')
  const [clockTime, setClockTime] = useState(freshClockTime)
  const [error, setError] = useState<string | null>(null)

  const boss = BOSSES.find((item) => item.id === target.bossId)
  const server = SERVERS.find((item) => item.id === target.serverId)

  function saveDate(date: Date | null) {
    if (!date) {
      setError('Enter a valid kill time.')
      return
    }
    if (date.getTime() > Date.now() + 60_000) {
      setError('That time is in the future. Tombstone times should already have happened.')
      return
    }
    onSave(date)
    onOpenChange(false)
  }

  function applyMinutesAgo() {
    const minutes = Number(minutesAgo)
    if (!Number.isFinite(minutes) || minutes < 0) {
      setError('Minutes ago must be zero or more.')
      return
    }
    saveDate(new Date(Date.now() - minutes * 60_000))
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
    saveDate(date)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Log tombstone time</DialogTitle>
        <DialogDescription>
          {boss?.name} · {server?.full} · Channel {target.channel}. Enter the kill time shown on the
          grave using this computer&apos;s clock.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => saveDate(new Date())}>
            Killed just now
          </Button>
          <div className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              value={minutesAgo}
              onChange={(event) => setMinutesAgo(event.target.value)}
              className="w-16"
              aria-label="Minutes ago"
            />
            <Button size="sm" variant="outline" onClick={applyMinutesAgo}>
              Minutes ago
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tombstone-clock">Clock time on the tombstone</Label>
          <div className="flex gap-2">
            <Input
              id="tombstone-clock"
              type="time"
              value={clockTime}
              onChange={(event) => setClockTime(event.target.value)}
            />
            <Button variant="outline" onClick={applyClockTime}>
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
          variant="ghost"
          onClick={() => {
            onClear()
            onOpenChange(false)
          }}
        >
          Clear report
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  )
}

export function LogKillDialog({
  open,
  target,
  onOpenChange,
  onSave,
  onClear,
}: LogKillDialogProps) {
  const formKey = target
    ? `${target.bossId}:${target.serverId}:${target.channel}:${String(open)}`
    : 'none'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {target ? (
          <KillForm
            key={formKey}
            target={target}
            onOpenChange={onOpenChange}
            onSave={onSave}
            onClear={onClear}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
