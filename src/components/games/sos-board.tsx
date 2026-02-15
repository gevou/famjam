'use client'

import { useState } from 'react'
import type { GameState, Move } from '@/lib/games/types'

export function SOSBoard({
  state,
  playerId,
  onMove,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
}) {
  const [selectedLetter, setSelectedLetter] = useState<'S' | 'O'>('S')
  const isMyTurn = state.currentTurn === playerId
  const size = state.size

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-white text-sm">
        {state.playerOrder.map((pid: string, i: number) => (
          <span key={pid} className={pid === state.currentTurn ? 'font-bold text-yellow-400' : ''}>
            Player {i + 1}: {state.scores[pid]} pts
            {pid === playerId && ' (you)'}
          </span>
        ))}
      </div>

      <p className="text-white text-lg">
        {isMyTurn ? 'Your turn!' : 'Waiting...'}
      </p>

      {isMyTurn && (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedLetter('S')}
            className={`w-14 h-14 rounded-xl text-2xl font-bold ${
              selectedLetter === 'S' ? 'bg-yellow-400 text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            S
          </button>
          <button
            onClick={() => setSelectedLetter('O')}
            className={`w-14 h-14 rounded-xl text-2xl font-bold ${
              selectedLetter === 'O' ? 'bg-yellow-400 text-gray-900' : 'bg-white/20 text-white'
            }`}
          >
            O
          </button>
        </div>
      )}

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, width: `${size * 3.5}rem` }}
      >
        {state.board.map((cell: string | null, i: number) => (
          <button
            key={i}
            onClick={() => isMyTurn && !cell && onMove({ position: i, letter: selectedLetter })}
            disabled={!isMyTurn || !!cell}
            className={`aspect-square bg-white/20 rounded-lg text-xl font-bold text-white
              flex items-center justify-center
              ${isMyTurn && !cell ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default'}`}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  )
}
