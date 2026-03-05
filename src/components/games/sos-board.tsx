'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { GameState, GameStatus, Move, WinLine } from '@/lib/games/types'

const PLAYER_COLORS = ['#facc15', '#f472b6', '#34d399', '#60a5fa'] // yellow, pink, green, blue
const CLAIM_DURATION = 5000

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

function ClaimButton({ deadline, onClaim, onPass }: { deadline: number; onClaim: () => void; onPass: () => void }) {
  const [remaining, setRemaining] = useState(CLAIM_DURATION)
  const passedRef = useRef(false)

  useEffect(() => {
    passedRef.current = false
    const interval = setInterval(() => {
      const left = Math.max(0, deadline - Date.now())
      setRemaining(left)
      if (left === 0 && !passedRef.current) {
        passedRef.current = true
        clearInterval(interval)
        onPass()
      }
    }, 50)
    return () => clearInterval(interval)
  }, [deadline, onPass])

  const progress = remaining / CLAIM_DURATION
  const seconds = Math.ceil(remaining / 1000)

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClaim}
        className="relative w-24 h-24 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 text-white font-bold text-xl shadow-lg animate-pulse flex items-center justify-center"
      >
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="4"
          />
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 46}`}
            strokeDashoffset={`${2 * Math.PI * 46 * (1 - progress)}`}
            style={{ transition: 'stroke-dashoffset 50ms linear' }}
          />
        </svg>
        <span className="z-10">SOS!</span>
      </button>
      <span className="text-white/60 text-sm">{seconds}s</span>
      <button
        onClick={onPass}
        className="text-white/40 hover:text-white/70 text-sm underline"
      >
        Pass
      </button>
    </div>
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
  const [selectedCell, setSelectedCell] = useState<number | null>(null)
  const [borderFlash, setBorderFlash] = useState(false)
  const isMyTurn = state.currentTurn === playerId
  const size = state.size
  const finished = gameStatus?.finished
  const lines: WinLine[] = state.lines || []
  const isClaiming = state.phase === 'claiming'
  const hasPendingSOS = isClaiming && state.pendingPatterns && state.pendingPatterns.length > 0

  // Border flash when entering claiming phase with SOS patterns
  useEffect(() => {
    if (hasPendingSOS) {
      setBorderFlash(true)
      const timer = setTimeout(() => setBorderFlash(false), 600)
      return () => clearTimeout(timer)
    }
  }, [hasPendingSOS, state.claimDeadline])

  // Clear selection when turn changes or phase changes
  useEffect(() => {
    setSelectedCell(null)
  }, [state.currentTurn, state.phase])

  const handleCellTap = useCallback((i: number) => {
    if (finished || isClaiming || !isMyTurn || state.board[i] !== null) return
    setSelectedCell(i === selectedCell ? null : i)
  }, [finished, isClaiming, isMyTurn, state.board, selectedCell])

  const handleLetterPick = useCallback((letter: 'S' | 'O') => {
    if (selectedCell === null) return
    onMove({ type: 'place', position: selectedCell, letter })
    setSelectedCell(null)
  }, [selectedCell, onMove])

  const handleClaim = useCallback(() => {
    onMove({ type: 'claim' })
  }, [onMove])

  const handlePass = useCallback(() => {
    onMove({ type: 'pass' })
  }, [onMove])

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

      {!finished && !isClaiming && (
        <p className="text-white text-lg">
          {isMyTurn
            ? selectedCell !== null ? 'Pick a letter' : 'Tap a square'
            : 'Waiting...'}
        </p>
      )}

      <div className={`relative transition-shadow duration-300 ${borderFlash ? 'ring-2 ring-yellow-400 rounded-lg shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}>
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, width: `${size * 3.5}rem` }}
        >
          {state.board.map((cell: string | null, i: number) => {
            const isSelected = selectedCell === i
            const canTap = !finished && !isClaiming && isMyTurn && !cell
            return (
              <button
                key={i}
                onClick={() => canTap && handleCellTap(i)}
                disabled={!canTap}
                className={`aspect-square rounded-lg text-xl font-bold text-white
                  flex items-center justify-center relative
                  ${isSelected
                    ? 'bg-yellow-400/40 ring-2 ring-yellow-400'
                    : 'bg-white/20'}
                  ${canTap && !isSelected ? 'hover:bg-white/30 cursor-pointer' : !canTap ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {cell ?? '\u00A0'}
                {/* Inline letter picker on selected cell */}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center gap-1 z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLetterPick('S') }}
                      className="w-10 h-10 rounded-lg bg-yellow-400 text-gray-900 font-bold text-lg shadow-md hover:bg-yellow-300 active:bg-yellow-500"
                    >
                      S
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLetterPick('O') }}
                      className="w-10 h-10 rounded-lg bg-yellow-400 text-gray-900 font-bold text-lg shadow-md hover:bg-yellow-300 active:bg-yellow-500"
                    >
                      O
                    </button>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        <SOSLines lines={lines} size={size} playerOrder={state.playerOrder} />
      </div>

      {isClaiming && isMyTurn && state.claimDeadline && (
        <ClaimButton
          deadline={state.claimDeadline}
          onClaim={handleClaim}
          onPass={handlePass}
        />
      )}

      {isClaiming && !isMyTurn && (
        <p className="text-yellow-300 text-lg font-semibold animate-pulse">
          Claiming...
        </p>
      )}
    </div>
  )
}
