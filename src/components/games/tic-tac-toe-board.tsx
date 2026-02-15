'use client'

import type { GameState, Move } from '@/lib/games/types'

export function TicTacToeBoard({
  state,
  playerId,
  onMove,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
}) {
  const isMyTurn = state.currentTurn === playerId
  const myMark = state.players.X === playerId ? 'X' : 'O'

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-white text-lg">
        {isMyTurn ? 'Your turn!' : "Opponent\u2019s turn..."}
        {' '}You are <span className="font-bold">{myMark}</span>
      </p>
      <div className="grid grid-cols-3 gap-2 w-72 h-72">
        {state.board.map((cell: string | null, i: number) => (
          <button
            key={i}
            onClick={() => isMyTurn && !cell && onMove({ position: i })}
            disabled={!isMyTurn || !!cell}
            className={`bg-white/20 rounded-xl text-4xl font-bold text-white
              flex items-center justify-center
              ${isMyTurn && !cell ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default'}
              ${cell === 'X' ? 'text-yellow-400' : cell === 'O' ? 'text-pink-400' : ''}`}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  )
}
