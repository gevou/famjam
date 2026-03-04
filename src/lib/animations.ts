import type { GameStatus } from './games/types'

export type VariantDef = { id: string; label: string }

export const WINNER_VARIANTS: VariantDef[] = [
  { id: 'confetti', label: 'Confetti Burst' },
  { id: 'fireworks', label: 'Fireworks' },
  { id: 'trophy', label: 'Trophy Drop' },
]

export const LOSER_VARIANTS: VariantDef[] = [
  { id: 'rain', label: 'Rain Cloud' },
  { id: 'wobble', label: 'Wobbly Shrink' },
  { id: 'spotlight', label: 'Spotlight Fade' },
]

export function pickVariant(count: number): number {
  return Math.floor(Math.random() * count)
}

export function classifyPlayers(
  status: GameStatus,
  playerOrder: string[]
): { winnerId: string | null; loserIds: string[] } {
  if (!status.finished || !status.winner) {
    return { winnerId: null, loserIds: [] }
  }
  return {
    winnerId: status.winner,
    loserIds: playerOrder.filter(pid => pid !== status.winner),
  }
}
