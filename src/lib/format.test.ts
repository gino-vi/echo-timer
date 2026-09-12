import { describe, expect, it } from 'vitest'
import { formatTimeInput, preferredClockTime } from '@/lib/format'

describe('formatTimeInput', () => {
  it('formats a local timestamp as HH:MM for a time input', () => {
    const date = new Date(2026, 8, 12, 4, 7)
    expect(formatTimeInput(date)).toBe('04:07')
  })
})

describe('preferredClockTime', () => {
  it('keeps the last typed clock even when a saved kill exists', () => {
    const existing = Date.parse('2026-09-12T10:00:00.000Z')
    expect(preferredClockTime('14:32', existing)).toBe('14:32')
  })

  it('falls back to the saved kill, then now', () => {
    const existing = new Date(2026, 8, 12, 10, 5).getTime()
    expect(preferredClockTime('', existing)).toBe('10:05')
    expect(preferredClockTime('', null, new Date(2026, 8, 12, 8, 9))).toBe('08:09')
  })
})
