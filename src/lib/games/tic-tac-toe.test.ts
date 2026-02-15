import { describe, it, expect } from 'vitest'
import { ticTacToe } from './tic-tac-toe'

describe('Tic-Tac-Toe', () => {
  const players = ['player1', 'player2']

  describe('initialState', () => {
    it('creates empty 3x3 board with player assignments', () => {
      const state = ticTacToe.initialState(players)
      expect(state.board).toEqual(Array(9).fill(null))
      expect(state.players).toEqual({ X: 'player1', O: 'player2' })
      expect(state.currentTurn).toBe('player1')
    })
  })

  describe('validateMove', () => {
    it('allows move on empty cell during player turn', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.validateMove(state, 'player1', { position: 0 })).toBe(true)
    })
    it('rejects move on occupied cell', () => {
      let state = ticTacToe.initialState(players)
      state = ticTacToe.applyMove(state, 'player1', { position: 0 })
      expect(ticTacToe.validateMove(state, 'player2', { position: 0 })).toBe(false)
    })
    it('rejects move when not player turn', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.validateMove(state, 'player2', { position: 0 })).toBe(false)
    })
    it('rejects move with out-of-range position', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.validateMove(state, 'player1', { position: 9 })).toBe(false)
      expect(ticTacToe.validateMove(state, 'player1', { position: -1 })).toBe(false)
    })
  })

  describe('applyMove', () => {
    it('places mark and switches turn', () => {
      const state = ticTacToe.initialState(players)
      const next = ticTacToe.applyMove(state, 'player1', { position: 4 })
      expect(next.board[4]).toBe('X')
      expect(next.currentTurn).toBe('player2')
    })
  })

  describe('getStatus', () => {
    it('detects horizontal win', () => {
      let state = ticTacToe.initialState(players)
      state = ticTacToe.applyMove(state, 'player1', { position: 0 })
      state = ticTacToe.applyMove(state, 'player2', { position: 3 })
      state = ticTacToe.applyMove(state, 'player1', { position: 1 })
      state = ticTacToe.applyMove(state, 'player2', { position: 4 })
      state = ticTacToe.applyMove(state, 'player1', { position: 2 })
      const status = ticTacToe.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('player1')
    })
    it('detects diagonal win', () => {
      let state = ticTacToe.initialState(players)
      state = ticTacToe.applyMove(state, 'player1', { position: 0 })
      state = ticTacToe.applyMove(state, 'player2', { position: 1 })
      state = ticTacToe.applyMove(state, 'player1', { position: 4 })
      state = ticTacToe.applyMove(state, 'player2', { position: 2 })
      state = ticTacToe.applyMove(state, 'player1', { position: 8 })
      const status = ticTacToe.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBe('player1')
    })
    it('detects draw', () => {
      let state = ticTacToe.initialState(players)
      const moves = [
        { p: 'player1', pos: 0 }, { p: 'player2', pos: 1 },
        { p: 'player1', pos: 2 }, { p: 'player2', pos: 5 },
        { p: 'player1', pos: 3 }, { p: 'player2', pos: 6 },
        { p: 'player1', pos: 4 }, { p: 'player2', pos: 8 },
        { p: 'player1', pos: 7 },
      ]
      for (const m of moves) {
        state = ticTacToe.applyMove(state, m.p, { position: m.pos })
      }
      const status = ticTacToe.getStatus(state)
      expect(status.finished).toBe(true)
      expect(status.winner).toBeUndefined()
    })
    it('returns not finished for in-progress game', () => {
      const state = ticTacToe.initialState(players)
      expect(ticTacToe.getStatus(state).finished).toBe(false)
    })
  })
})
