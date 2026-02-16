export interface GameState {
  [key: string]: any
}

export interface Move {
  [key: string]: any
}

export interface WinLine {
  cells: number[]
  player: string
}

export interface GameStatus {
  finished: boolean
  winner?: string
  scores?: Record<string, number>
  extraTurn?: boolean
  winLine?: number[]
}

export interface GameDefinition {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  initialState(playerIds: string[]): GameState
  validateMove(state: GameState, playerId: string, move: Move): boolean
  applyMove(state: GameState, playerId: string, move: Move): GameState
  getStatus(state: GameState): GameStatus
  getNextPlayer(state: GameState): string
}
