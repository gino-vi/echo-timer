import { describe, expect, it } from 'vitest'
import { hunterLabel, listConnectedHunters } from '@/lib/hunters'

describe('hunterLabel', () => {
  it('keeps a typed name', () => {
    expect(hunterLabel('Ada')).toEqual({ label: 'Ada', anonymous: false })
  })

  it('treats a blank name as Anonymous', () => {
    expect(hunterLabel('   ')).toEqual({ label: 'Anonymous', anonymous: true })
  })
})

describe('listConnectedHunters', () => {
  it('puts you first and unnamed peers last', () => {
    const rows = listConnectedHunters('Ben', [
      { id: '2', name: '' },
      { id: '1', name: 'Ada' },
    ])
    expect(rows.map((row) => row.label)).toEqual(['Ben', 'Ada', 'Anonymous'])
    expect(rows[0]?.isSelf).toBe(true)
    expect(rows[2]?.anonymous).toBe(true)
  })
})
