import type { GameDefinition, GameState, Move, GameStatus, WinLine } from './types'

const DIRECTIONS: [number, number][] = [
  [0, 1], [1, 0], [1, 1], [1, -1],
]

function findNewSOS(board: (string | null)[], size: number, position: number): number[][] {
  const row = Math.floor(position / size)
  const col = position % size
  const letter = board[position]
  const patterns: number[][] = []

  for (const [dr, dc] of DIRECTIONS) {
    if (letter === 'S') {
      // Check if this S is the START of S-O-S (look forward: +1, +2)
      const oRow = row + dr, oCol = col + dc
      const sRow = row + 2 * dr, sCol = col + 2 * dc
      if (sRow >= 0 && sRow < size && sCol >= 0 && sCol < size &&
          oRow >= 0 && oRow < size && oCol >= 0 && oCol < size) {
        const oIdx = oRow * size + oCol
        const sIdx = sRow * size + sCol
        if (board[oIdx] === 'O' && board[sIdx] === 'S') {
          patterns.push([position, oIdx, sIdx])
        }
      }
      // Check if this S is the END of S-O-S (look backward: -1, -2)
      const oRow2 = row - dr, oCol2 = col - dc
      const sRow2 = row - 2 * dr, sCol2 = col - 2 * dc
      if (sRow2 >= 0 && sRow2 < size && sCol2 >= 0 && sCol2 < size &&
          oRow2 >= 0 && oRow2 < size && oCol2 >= 0 && oCol2 < size) {
        const oIdx2 = oRow2 * size + oCol2
        const sIdx2 = sRow2 * size + sCol2
        if (board[oIdx2] === 'O' && board[sIdx2] === 'S') {
          patterns.push([sIdx2, oIdx2, position])
        }
      }
    } else if (letter === 'O') {
      // Check if this O is the MIDDLE of S-O-S (look both sides: -1 and +1)
      const sRow1 = row - dr, sCol1 = col - dc
      const sRow2 = row + dr, sCol2 = col + dc
      if (sRow1 >= 0 && sRow1 < size && sCol1 >= 0 && sCol1 < size &&
          sRow2 >= 0 && sRow2 < size && sCol2 >= 0 && sCol2 < size) {
        const sIdx1 = sRow1 * size + sCol1
        const sIdx2 = sRow2 * size + sCol2
        if (board[sIdx1] === 'S' && board[sIdx2] === 'S') {
          patterns.push([sIdx1, position, sIdx2])
        }
      }
    }
  }

  return patterns
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
      lines: [] as WinLine[],
      phase: 'play' as 'play' | 'claiming',
      pendingPatterns: null as number[][] | null,
      claimDeadline: null as number | null,
    }
  },

  validateMove(state: GameState, playerId: string, move: Move): boolean {
    if (state.currentTurn !== playerId) return false

    const moveType = move.type || 'place'

    if (moveType === 'place') {
      if (state.phase === 'claiming') return false
      const { position, letter } = move
      if (letter !== 'S' && letter !== 'O') return false
      if (position < 0 || position >= state.board.length) return false
      if (state.board[position] !== null) return false
      return true
    }

    if (moveType === 'claim' || moveType === 'pass') {
      if (state.phase !== 'claiming') return false
      return true
    }

    return false
  },

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    const moveType = move.type || 'place'

    if (moveType === 'place') {
      const board = [...state.board]
      board[move.position] = move.letter
      const newPatterns = findNewSOS(board, state.size, move.position)

      return {
        ...state,
        board,
        phase: 'claiming',
        pendingPatterns: newPatterns,
        claimDeadline: Date.now() + 5000,
      }
    }

    if (moveType === 'claim') {
      const pendingPatterns: number[][] = state.pendingPatterns || []
      if (pendingPatterns.length > 0) {
        const scores = { ...state.scores }
        scores[playerId] = (scores[playerId] || 0) + pendingPatterns.length

        const lines: WinLine[] = [
          ...(state.lines || []),
          ...pendingPatterns.map((cells: number[]) => ({ cells, player: playerId })),
        ]

        // Extra turn — keep same player
        return {
          ...state,
          scores,
          lines,
          phase: 'play',
          pendingPatterns: null,
          claimDeadline: null,
        }
      }

      // No patterns to claim — just go back to play, advance turn
      const nextIndex = (state.currentTurnIndex + 1) % state.playerOrder.length
      return {
        ...state,
        phase: 'play',
        pendingPatterns: null,
        claimDeadline: null,
        currentTurnIndex: nextIndex,
        currentTurn: state.playerOrder[nextIndex],
      }
    }

    if (moveType === 'pass') {
      // Forfeit any pending patterns, advance turn
      const nextIndex = (state.currentTurnIndex + 1) % state.playerOrder.length
      return {
        ...state,
        phase: 'play',
        pendingPatterns: null,
        claimDeadline: null,
        currentTurnIndex: nextIndex,
        currentTurn: state.playerOrder[nextIndex],
      }
    }

    return state
  },

  getStatus(state: GameState): GameStatus {
    const boardFull = state.board.every((cell: string | null) => cell !== null)
    // Don't finish while in claiming phase
    if (state.phase === 'claiming') return { finished: false }

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
