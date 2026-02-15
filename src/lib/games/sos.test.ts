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
    })
  })

  describe('validateMove', () => {
    it('allows placing S or O on empty cell during turn', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { position: 0, letter: 'S' })).toBe(true)
      expect(sos.validateMove(state, 'alice', { position: 0, letter: 'O' })).toBe(true)
    })

    it('rejects invalid letter', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'alice', { position: 0, letter: 'X' })).toBe(false)
    })

    it('rejects occupied cell', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      expect(sos.validateMove(state, 'bob', { position: 0, letter: 'O' })).toBe(false)
    })

    it('rejects wrong player turn', () => {
      const state = sos.initialState(players)
      expect(sos.validateMove(state, 'bob', { position: 0, letter: 'S' })).toBe(false)
    })
  })

  describe('SOS detection', () => {
    it('detects horizontal SOS', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 2, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })

    it('gives extra turn when scoring', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 2, letter: 'S' })
      expect(state.currentTurn).toBe('alice')
    })

    it('detects vertical SOS', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 5, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 10, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })

    it('detects diagonal SOS', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 6, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 12, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })

    it('awards multiple SOS for a single move', () => {
      let state = sos.initialState(players)
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      state = sos.applyMove(state, 'alice', { position: 5, letter: 'O' })
      state = sos.applyMove(state, 'bob', { position: 10, letter: 'S' })
      state = sos.applyMove(state, 'alice', { position: 2, letter: 'S' })
      expect(state.scores.alice).toBe(1)
    })
  })

  describe('getStatus (general variant)', () => {
    it('game not finished while board has empty cells', () => {
      const state = sos.initialState(players)
      expect(sos.getStatus(state).finished).toBe(false)
    })

    it('game finishes when board is full, highest score wins', () => {
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
        state = sos.applyMove(state, m.p, { position: m.pos, letter: m.l })
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
      state = sos.applyMove(state, 'alice', { position: 0, letter: 'S' })
      expect(state.currentTurn).toBe('bob')
      state = sos.applyMove(state, 'bob', { position: 1, letter: 'O' })
      expect(state.currentTurn).toBe('charlie')
    })
  })
})
