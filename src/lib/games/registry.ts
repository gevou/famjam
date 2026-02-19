import type { GameDefinition } from './types'
import { ticTacToe } from './tic-tac-toe'
import { sos } from './sos'
import { monopoly } from './monopoly'

const games: Record<string, GameDefinition> = {
  'tic-tac-toe': ticTacToe,
  'sos': sos,
  'monopoly': monopoly,
}

export function getGame(id: string): GameDefinition {
  const game = games[id]
  if (!game) throw new Error(`Unknown game: ${id}`)
  return game
}

export function listGames(): GameDefinition[] {
  return Object.values(games)
}

export function registerGame(game: GameDefinition) {
  games[game.id] = game
}
