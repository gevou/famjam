import type { GameDefinition, GameState, Move, GameStatus } from './types'

const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [1, -1],
]

function countNewSOS(board: (string | null)[], size: number, position: number): number {
  const row = Math.floor(position / size)
  const col = position % size
  const letter = board[position]
  let count = 0

  for (const [dr, dc] of DIRECTIONS) {
    if (letter === 'S') {
      const oRow = row + dr, oCol = col + dc
      const sRow = row + 2 * dr, sCol = col + 2 * dc
      if (sRow >= 0 && sRow < size && sCol >= 0 && sCol < size &&
          oRow >= 0 && oRow < size && oCol >= 0 && oCol < size) {
        if (board[oRow * size + oCol] === 'O' && board[sRow * size + sCol] === 'S') count++
      }
      const oRow2 = row - dr, oCol2 = col - dc
      const sRow2 = row - 2 * dr, sCol2 = col - 2 * dc
      if (sRow2 >= 0 && sRow2 < size && sCol2 >= 0 && sCol2 < size &&
          oRow2 >= 0 && oRow2 < size && oCol2 >= 0 && oCol2 < size) {
        if (board[oRow2 * size + oCol2] === 'O' && board[sRow2 * size + sCol2] === 'S') count++
      }
    } else if (letter === 'O') {
      const sRow1 = row - dr, sCol1 = col - dc
      const sRow2 = row + dr, sCol2 = col + dc
      if (sRow1 >= 0 && sRow1 < size && sCol1 >= 0 && sCol1 < size &&
          sRow2 >= 0 && sRow2 < size && sCol2 >= 0 && sCol2 < size) {
        if (board[sRow1 * size + sCol1] === 'S' && board[sRow2 * size + sCol2] === 'S') count++
      }
    }
  }
  return count
}

export const sos: GameDefinition = {
  id: 'sos',
  name: 'S.O.S.',
  minPlayers: 2,
  maxPlayers: 4,

  initialState(playerIds: string[]): GameState {
    const size = 5
    const scores: Record<string, number> = {}
    for (const id of playerIds) scores[id] = 0
    return {
      board: Array(size * size).fill(null),
      size,
      variant: 'general',
      playerOrder: [...playerIds],
      currentTurnIndex: 0,
      currentTurn: playerIds[0],
      scores,
    }
  },

  validateMove(state: GameState, playerId: string, move: Move): boolean {
    if (state.currentTurn !== playerId) return false
    const { position, letter } = move
    if (letter !== 'S' && letter !== 'O') return false
    if (position < 0 || position >= state.board.length) return false
    if (state.board[position] !== null) return false
    return true
  },

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    const board = [...state.board]
    board[move.position] = move.letter
    const newSOS = countNewSOS(board, state.size, move.position)
    const scores = { ...state.scores }
    scores[playerId] = (scores[playerId] || 0) + newSOS

    let nextIndex = state.currentTurnIndex
    if (newSOS === 0) {
      nextIndex = (state.currentTurnIndex + 1) % state.playerOrder.length
    }

    return {
      ...state,
      board,
      scores,
      currentTurnIndex: nextIndex,
      currentTurn: state.playerOrder[nextIndex],
    }
  },

  getStatus(state: GameState): GameStatus {
    const boardFull = state.board.every((cell: string | null) => cell !== null)

    if (state.variant === 'simple') {
      for (const [id, score] of Object.entries(state.scores)) {
        if ((score as number) > 0) return { finished: true, winner: id, scores: state.scores }
      }
      if (boardFull) return { finished: true, scores: state.scores }
      return { finished: false }
    }

    if (!boardFull) return { finished: false }

    const maxScore = Math.max(...Object.values(state.scores) as number[])
    const winners = Object.entries(state.scores).filter(([, s]) => s === maxScore)
    if (winners.length === 1) {
      return { finished: true, winner: winners[0][0], scores: state.scores }
    }
    return { finished: true, scores: state.scores }
  },

  getNextPlayer(state: GameState): string {
    return state.currentTurn
  },
}
