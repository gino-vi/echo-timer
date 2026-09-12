import { describe, expect, it } from 'vitest'
import { playerLabel, listConnectedPlayers } from '@/lib/players'

describe('playerLabel', () => {
  it('keeps a typed name', () => {
    expect(playerLabel('Ada')).toEqual({ label: 'Ada', anonymous: false })
  })

  it('treats a blank name as Anonymous', () => {
    expect(playerLabel('   ')).toEqual({ label: 'Anonymous', anonymous: true })
  })
})

describe('listConnectedPlayers', () => {
  it('puts you first and unnamed peers last', () => {
    const rows = listConnectedPlayers('Ben', [
      { id: '2', name: '' },
      { id: '1', name: 'Ada' },
    ])
    expect(rows.map((row) => row.label)).toEqual(['Ben', 'Ada', 'Anonymous'])
    expect(rows[0]?.isSelf).toBe(true)
    expect(rows[2]?.anonymous).toBe(true)
  })
})
