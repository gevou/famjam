'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameState, GameStatus, Move, WinLine } from '@/lib/games/types'

const PLAYER_COLORS = ['#facc15', '#f472b6', '#34d399', '#60a5fa']

function SOSLines({ lines, size, playerOrder }: { lines: WinLine[]; size: number; playerOrder: string[] }) {
  if (!lines.length) return null
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${size} ${size}`}>
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
          <line key={idx}
            x1={x1 - dx} y1={y1 - dy} x2={x2 + dx} y2={y2 + dy}
            stroke={color} strokeWidth={0.08} strokeLinecap="round" opacity={0.85}
          />
        )
      })}
    </svg>
  )
}

export function SOSBoard({
  state, playerId, onMove, gameStatus,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
  gameStatus?: GameStatus | null
  botEnabled?: boolean
}) {
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [borderFlash, setBorderFlash] = useState(false)
  const [sosToast, setSOSToast] = useState<{ count: number; player: string } | null>(null)
  const prevLinesCount = useRef(state.lines?.length || 0)
  const isMyTurn = state.currentTurn === playerId
  const size = state.size
  const finished = gameStatus?.finished
  const lines: WinLine[] = state.lines || []

  // Border flash + toast when new SOS lines appear
  useEffect(() => {
    const newCount = lines.length - prevLinesCount.current
    if (newCount > 0) {
      setBorderFlash(true)
      const scorer = lines[lines.length - 1]?.player
      setSOSToast({ count: newCount, player: scorer })
      const flashTimer = setTimeout(() => setBorderFlash(false), 600)
      const toastTimer = setTimeout(() => setSOSToast(null), 2000)
      prevLinesCount.current = lines.length
      return () => { clearTimeout(flashTimer); clearTimeout(toastTimer) }
    }
    prevLinesCount.current = lines.length
  }, [lines.length])

  // Clear selection when turn changes
  useEffect(() => { setSelectedCell(null) }, [state.currentTurn])

  const handleCellTap = useCallback((i: number) => {
    if (finished || !isMyTurn || state.board[i] !== null) return
    setSelectedCell(i === selectedCell ? null : i)
  }, [finished, isMyTurn, state.board, selectedCell])

  const handleLetterPick = useCallback((letter: 'S' | 'O') => {
    if (selectedCell === null) return
    onMove({ type: 'place', position: selectedCell, letter })
    setSelectedCell(null)
  }, [selectedCell, onMove])

  return (
    <div className="flex flex-col items-center gap-3 relative">
      {/* SOS scored toast */}
      {sosToast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 bg-yellow-400 text-gray-900 px-4 py-2 rounded-full font-bold text-base shadow-lg animate-bounce whitespace-nowrap">
          SOS! +{sosToast.count}
        </div>
      )}

      {/* Letter picker — fixed overlay, always visible above everything */}
      {selectedCell !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-[env(safe-area-inset-bottom,16px)] pointer-events-none">
          <div className="flex items-center gap-4 bg-black/70 backdrop-blur-md px-6 py-4 rounded-full shadow-xl pointer-events-auto mb-4">
            <button
              onClick={() => handleLetterPick('S')}
              className="w-[4.5rem] h-[4.5rem] rounded-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 font-bold text-3xl shadow-md transition-transform active:scale-90"
            >S</button>
            <button
              onClick={() => handleLetterPick('O')}
              className="w-[4.5rem] h-[4.5rem] rounded-full bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 font-bold text-3xl shadow-md transition-transform active:scale-90"
            >O</button>
            <button
              onClick={() => setSelectedCell(null)}
              className="w-11 h-11 rounded-full bg-white/10 text-white/60 hover:text-white/90 text-xl flex items-center justify-center"
            >&times;</button>
          </div>
        </div>
      )}

      {/* Board card */}
      <div className={`relative bg-white/10 backdrop-blur-sm rounded-2xl p-3 shadow-lg transition-shadow duration-300 ${
        borderFlash ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''
      }`}>
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, width: `min(92vw, ${size * 3.5}rem)` }}
        >
          {state.board.map((cell: string | null, i: number) => {
            const isSelected = selectedCell === i
            const canTap = !finished && isMyTurn && !cell
            return (
              <button
                key={i}
                onClick={() => canTap && handleCellTap(i)}
                disabled={!canTap}
                className={`aspect-square rounded-lg text-xl font-bold text-white
                  flex items-center justify-center
                  ${isSelected
                    ? 'bg-yellow-400/30 ring-2 ring-yellow-400'
                    : 'bg-white/15'}
                  ${canTap && !isSelected ? 'hover:bg-white/25 active:bg-white/30 cursor-pointer' : !canTap ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {cell ?? '\u00A0'}
              </button>
            )
          })}
        </div>
        <SOSLines lines={lines} size={size} playerOrder={state.playerOrder} />
      </div>

      {/* Compact score pill */}
      <div className="bg-black/40 backdrop-blur-sm rounded-full px-4 py-1.5 flex gap-3 items-center">
        {state.playerOrder.map((pid: string, i: number) => (
          <span key={pid} className="flex items-center gap-1.5 text-sm tabular-nums">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PLAYER_COLORS[i] }} />
            <span className={`font-semibold ${pid === state.currentTurn && !finished ? 'text-white' : 'text-white/60'}`}>
              {state.scores[pid]}
            </span>
            {pid === playerId && <span className="text-white/40 text-[10px]">you</span>}
          </span>
        ))}
      </div>
    </div>
  )
}
