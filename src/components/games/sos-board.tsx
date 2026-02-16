'use client'

import { useState } from 'react'
import type { GameState, GameStatus, Move, WinLine } from '@/lib/games/types'

const PLAYER_COLORS = ['#facc15', '#f472b6', '#34d399', '#60a5fa'] // yellow, pink, green, blue

function SOSLines({ lines, size, playerOrder }: { lines: WinLine[]; size: number; playerOrder: string[] }) {
  if (!lines.length) return null

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${size} ${size}`}
    >
      {lines.map((line, idx) => {
        const [a, , c] = line.cells
        const playerIdx = playerOrder.indexOf(line.player)
        const color = PLAYER_COLORS[playerIdx] || '#fff'

        const x1 = (a % size) + 0.5
        const y1 = Math.floor(a / size) + 0.5
        const x2 = (c % size) + 0.5
        const y2 = Math.floor(c / size) + 0.5

        const dx = (x2 - x1) * 0.15
        const dy = (y2 - y1) * 0.15

        return (
          <line
            key={idx}
            x1={x1 - dx} y1={y1 - dy}
            x2={x2 + dx} y2={y2 + dy}
            stroke={color}
            strokeWidth={0.08}
            strokeLinecap="round"
            opacity={0.85}
          />
        )
      })}
    </svg>
  )
}

export function SOSBoard({
  state,
  playerId,
  onMove,
  gameStatus,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
  gameStatus?: GameStatus | null
}) {
  const [selectedLetter, setSelectedLetter] = useState<'S' | 'O'>('S')
  const isMyTurn = state.currentTurn === playerId
  const size = state.size
  const finished = gameStatus?.finished
  const lines: WinLine[] = state.lines || []

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 text-white text-sm">
        {state.playerOrder.map((pid: string, i: number) => (
          <span
            key={pid}
            className={pid === state.currentTurn && !finished ? 'font-bold' : ''}
            style={{ color: pid === state.currentTurn && !finished ? PLAYER_COLORS[i] : undefined }}
          >
            <span
              className="inline-block w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: PLAYER_COLORS[i] }}
            />
            {state.scores[pid]} pts
            {pid === playerId && ' (you)'}
          </span>
        ))}
      </div>

      {!finished && (
        <p className="text-white text-lg">
          {isMyTurn ? 'Your turn!' : 'Waiting...'}
        </p>
      )}

      {!finished && isMyTurn && (
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

      <div className="relative">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, width: `${size * 3.5}rem` }}
        >
          {state.board.map((cell: string | null, i: number) => (
            <button
              key={i}
              onClick={() => !finished && isMyTurn && !cell && onMove({ position: i, letter: selectedLetter })}
              disabled={!!finished || !isMyTurn || !!cell}
              className={`aspect-square bg-white/20 rounded-lg text-xl font-bold text-white
                flex items-center justify-center
                ${!finished && isMyTurn && !cell ? 'hover:bg-white/30 cursor-pointer' : 'cursor-default'}`}
            >
              {cell ?? '\u00A0'}
            </button>
          ))}
        </div>
        <SOSLines lines={lines} size={size} playerOrder={state.playerOrder} />
      </div>
    </div>
  )
}
