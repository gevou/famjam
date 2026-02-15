import type { GameDefinition, GameState, Move, GameStatus } from './types'

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

export const ticTacToe: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  minPlayers: 2,
  maxPlayers: 2,

  initialState(playerIds: string[]): GameState {
    return {
      board: Array(9).fill(null),
      players: { X: playerIds[0], O: playerIds[1] },
      currentTurn: playerIds[0],
    }
  },

  validateMove(state: GameState, playerId: string, move: Move): boolean {
    if (state.currentTurn !== playerId) return false
    const pos = move.position
    if (pos < 0 || pos > 8) return false
    if (state.board[pos] !== null) return false
    return true
  },

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    const mark = state.players.X === playerId ? 'X' : 'O'
    const board = [...state.board]
    board[move.position] = mark
    const nextPlayer = state.players.X === playerId ? state.players.O : state.players.X
    return { ...state, board, currentTurn: nextPlayer }
  },

  getStatus(state: GameState): GameStatus {
    for (const [a, b, c] of WIN_LINES) {
      if (state.board[a] && state.board[a] === state.board[b] && state.board[b] === state.board[c]) {
        const winnerMark = state.board[a]
        return { finished: true, winner: state.players[winnerMark] }
      }
    }
    if (state.board.every((cell: string | null) => cell !== null)) {
      return { finished: true }
    }
    return { finished: false }
  },

  getNextPlayer(state: GameState): string {
    return state.currentTurn
  },
}
