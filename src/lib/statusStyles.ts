import type { TimerStatus } from '@/lib/timers'

export const STATUS_STYLES: Record<TimerStatus, string> = {
  unknown:
    'appearance-none border-dashed border-border/70 bg-background/20 text-muted-foreground hover:border-primary/40',
  dead: 'appearance-none border-rose-500/50 bg-rose-950/80 text-rose-50 hover:border-rose-400/70',
  window:
    'appearance-none border-amber-400/50 bg-amber-950/80 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.16)] hover:border-amber-300/80',
  overdue:
    'appearance-none border-emerald-400/50 bg-emerald-950/80 text-emerald-50 hover:border-emerald-300/80',
  alive:
    'appearance-none border-lime-400/60 bg-lime-950/85 text-lime-50 hover:border-lime-300/80',
  stale: 'appearance-none border-zinc-500/50 bg-zinc-800 text-zinc-400 hover:border-zinc-400/60',
}
