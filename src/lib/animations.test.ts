import { describe, it, expect } from 'vitest'
import { pickVariant, classifyPlayers, WINNER_VARIANTS, LOSER_VARIANTS } from './animations'

describe('pickVariant', () => {
  it('returns a number between 0 and count-1', () => {
    for (let i = 0; i < 20; i++) {
      const v = pickVariant(3)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(3)
    }
  })
  it('returns 0 when count is 1', () => {
    expect(pickVariant(1)).toBe(0)
  })
})

describe('classifyPlayers', () => {
  it('identifies winner and losers from game status', () => {
    const result = classifyPlayers(
      { finished: true, winner: 'alice', scores: { alice: 30, bob: 15, charlie: 20 } },
      ['alice', 'bob', 'charlie']
    )
    expect(result.winnerId).toBe('alice')
    expect(result.loserIds).toEqual(['bob', 'charlie'])
  })
  it('returns null winner for draws', () => {
    const result = classifyPlayers(
      { finished: true, scores: { alice: 15, bob: 15 } },
      ['alice', 'bob']
    )
    expect(result.winnerId).toBeNull()
    expect(result.loserIds).toEqual([])
  })
  it('returns null for unfinished games', () => {
    const result = classifyPlayers(
      { finished: false, scores: { alice: 10, bob: 10 } },
      ['alice', 'bob']
    )
    expect(result.winnerId).toBeNull()
    expect(result.loserIds).toEqual([])
  })
})

describe('variant arrays', () => {
  it('has exactly 3 winner variants', () => {
    expect(WINNER_VARIANTS).toHaveLength(3)
  })
  it('has exactly 3 loser variants', () => {
    expect(LOSER_VARIANTS).toHaveLength(3)
  })
  it('each variant has id and label', () => {
    for (const v of [...WINNER_VARIANTS, ...LOSER_VARIANTS]) {
      expect(v.id).toBeTruthy()
      expect(v.label).toBeTruthy()
    }
  })
})
