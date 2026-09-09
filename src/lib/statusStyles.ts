import type { TimerStatus } from '@/lib/timers'

export const STATUS_STYLES: Record<TimerStatus, string> = {
  unknown:
    'border-dashed border-border/70 bg-background/20 text-muted-foreground hover:border-primary/40',
  dead: 'border-rose-500/30 bg-rose-950/35 text-rose-50 hover:border-rose-400/50',
  window:
    'border-amber-400/40 bg-amber-950/40 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)] hover:border-amber-300/70',
  overdue:
    'border-emerald-400/40 bg-emerald-950/40 text-emerald-50 hover:border-emerald-300/70',
  stale: 'border-zinc-500/40 bg-zinc-800/70 text-zinc-400 hover:border-zinc-400/50',
}
