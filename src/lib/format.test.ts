import { describe, expect, it } from 'vitest'
import { formatTimeInput } from '@/lib/format'

describe('formatTimeInput', () => {
  it('formats a local timestamp as HH:MM for a time input', () => {
    const date = new Date(2026, 8, 12, 4, 7)
    expect(formatTimeInput(date)).toBe('04:07')
  })
})
