import { describe, it, expect } from 'vitest'
import { sos } from './sos'

describe('S.O.S.', () => {
  const players = ['alice', 'bob']

  describe('initialState', () => {
    it('creates empty board with default 5x5 size', () => {
      const state = sos.initialState(players)
      expect(state.board).toEqual(Array(25).fill(null))
      expect(state.size).toBe(5)
      expect(state.playerOrder).toEqual(['alice', 'bob'])
      expect(state.scores).toEqual({ alice: 0, bob: 0 })
      expect(state.currentTurn).toBe('alice')
      expect(state.variant).toBe('general')
      expect(state.phase).toBe('play')
      expect(state.pendingPatterns).toBeNull()
      expect(state.claimDeadline).toBeNull()
    })
  })

  describe('validateMove', () => {
    it('allows placing S or O on empty cell during turn', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })).toBe(true)
      expect(sos.validateMove(state, 'alice', { type: 'place', position: 0, letter: 'O' })).toBe(true)
    })

    it('rejects invalid letter', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { type: 'place', position: 0, letter: 'X' })).toBe(false)
    })

    it('rejects occupied cell', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      // In claiming phase, pass first to advance turn
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      expect(sos.validateMove(state, 'bob', { type: 'place', position: 0, letter: 'O' })).toBe(false)
    })

    it('rejects wrong player turn', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'bob', { type: 'place', position: 0, letter: 'S' })).toBe(false)
    })

    it('rejects place during claiming phase', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      expect(state.phase).toBe('claiming')
      expect(sos.validateMove(state, 'alice', { type: 'place', position: 1, letter: 'O' })).toBe(false)
    })

    it('rejects claim/pass during play phase', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { type: 'claim' })).toBe(false)
      expect(sos.validateMove(state, 'alice', { type: 'pass' })).toBe(false)
    })
  })

  describe('claiming mechanic', () => {
    it('place enters claiming phase with correct pendingPatterns', () => {
      let state = sos.initialState(players)
      // Set up: S at 0, O at 1
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      state = sos.applyMove(state, 'bob', { type: 'place', position: 1, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      // Now alice places S at 2 to complete SOS
      state = sos.applyMove(state, 'alice', { type: 'place', position: 2, letter: 'S' })

      expect(state.phase).toBe('claiming')
      expect(state.pendingPatterns).toHaveLength(1)
      expect(state.pendingPatterns![0]).toEqual([0, 1, 2])
      expect(state.claimDeadline).toBeGreaterThan(0)
      // Score not yet awarded
      expect(state.scores.alice).toBe(0)
    })

    it('place then claim scores and gives extra turn', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      state = sos.applyMove(state, 'bob', { type: 'place', position: 1, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      state = sos.applyMove(state, 'alice', { type: 'place', position: 2, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'claim' })

      expect(state.phase).toBe('play')
      expect(state.scores.alice).toBe(1)
      expect(state.currentTurn).toBe('alice') // extra turn
      expect(state.lines).toHaveLength(1)
    })

    it('place then pass forfeits score and advances turn', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      state = sos.applyMove(state, 'bob', { type: 'place', position: 1, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      state = sos.applyMove(state, 'alice', { type: 'place', position: 2, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })

      expect(state.phase).toBe('play')
      expect(state.scores.alice).toBe(0) // no score
      expect(state.currentTurn).toBe('bob') // next player
    })

    it('place with no SOS enters claiming phase with empty pendingPatterns, claim advances turn', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })

      expect(state.phase).toBe('claiming')
      expect(state.pendingPatterns).toHaveLength(0)

      // Claim with no patterns — advances turn
      state = sos.applyMove(state, 'alice', { type: 'claim' })
      expect(state.phase).toBe('play')
      expect(state.scores.alice).toBe(0)
      expect(state.currentTurn).toBe('bob')
    })
  })

  describe('SOS detection', () => {
    it('detects horizontal SOS', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      state = sos.applyMove(state, 'bob', { type: 'place', position: 1, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      state = sos.applyMove(state, 'alice', { type: 'place', position: 2, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'claim' })
      expect(state.scores.alice).toBe(1)
    })

    it('detects vertical SOS', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      state = sos.applyMove(state, 'bob', { type: 'place', position: 5, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      state = sos.applyMove(state, 'alice', { type: 'place', position: 10, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'claim' })
      expect(state.scores.alice).toBe(1)
    })

    it('detects diagonal SOS', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      state = sos.applyMove(state, 'bob', { type: 'place', position: 6, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      state = sos.applyMove(state, 'alice', { type: 'place', position: 12, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'claim' })
      expect(state.scores.alice).toBe(1)
    })
  })

  describe('getStatus (general variant)', () => {
    it('game not finished while board has empty cells', () => {
      const state = sos.initialState(players)
      expect(sos.getStatus(state).finished).toBe(false)
    })

    it('game not finished during claiming phase even if board is full', () => {
      let state = sos.initialState(players)
      state = { ...state, size: 3, board: Array(9).fill(null) }
      // Fill all but last cell
      const moves = [
        { p: 'alice', pos: 0, l: 'S' }, { p: 'bob', pos: 1, l: 'O' },
        { p: 'alice', pos: 2, l: 'S' },
        { p: 'alice', pos: 3, l: 'S' }, { p: 'bob', pos: 4, l: 'O' },
        { p: 'alice', pos: 5, l: 'S' },
        { p: 'alice', pos: 6, l: 'S' }, { p: 'bob', pos: 7, l: 'O' },
      ]
      for (const m of moves) {
        state = sos.applyMove(state, m.p, { type: 'place', position: m.pos, letter: m.l })
        // Claim if there are patterns, otherwise pass
        if (state.pendingPatterns && state.pendingPatterns.length > 0) {
          state = sos.applyMove(state, m.p, { type: 'claim' })
        } else {
          state = sos.applyMove(state, m.p, { type: 'pass' })
        }
      }
      // Place last cell — enters claiming phase
      state = sos.applyMove(state, 'alice', { type: 'place', position: 8, letter: 'S' })
      expect(state.phase).toBe('claiming')
      expect(sos.getStatus(state).finished).toBe(false)
    })

    it('game finishes when board is full and not claiming, highest score wins', () => {
      let state = sos.initialState(players)
      state = { ...state, size: 3, board: Array(9).fill(null) }
      const moves = [
        { p: 'alice', pos: 0, l: 'S' }, { p: 'bob', pos: 1, l: 'O' },
        { p: 'alice', pos: 2, l: 'S' },
        { p: 'alice', pos: 3, l: 'S' }, { p: 'bob', pos: 4, l: 'O' },
        { p: 'alice', pos: 5, l: 'S' },
        { p: 'alice', pos: 6, l: 'S' }, { p: 'bob', pos: 7, l: 'O' },
        { p: 'alice', pos: 8, l: 'S' },
      ]
      for (const m of moves) {
        state = sos.applyMove(state, m.p, { type: 'place', position: m.pos, letter: m.l })
        if (state.pendingPatterns && state.pendingPatterns.length > 0) {
          state = sos.applyMove(state, m.p, { type: 'claim' })
        } else {
          state = sos.applyMove(state, m.p, { type: 'pass' })
        }
      }
      const status = sos.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('alice')
    })
  })

  describe('supports 3-4 players', () => {
    it('rotates turns among 3 players', () => {
      const threePlayers = ['alice', 'bob', 'charlie']
      let state = sos.initialState(threePlayers)
      expect(state.currentTurn).toBe('alice')
      state = sos.applyMove(state, 'alice', { type: 'place', position: 0, letter: 'S' })
      state = sos.applyMove(state, 'alice', { type: 'pass' })
      expect(state.currentTurn).toBe('bob')
      state = sos.applyMove(state, 'bob', { type: 'place', position: 1, letter: 'O' })
      state = sos.applyMove(state, 'bob', { type: 'pass' })
      expect(state.currentTurn).toBe('charlie')
    })
  })
})
