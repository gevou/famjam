'use client'

import type { GameState, GameStatus, Move } from '@/lib/games/types'

const MARK_COLORS: Record<string, string> = {
  X: '#facc15', // yellow-400
  O: '#f472b6', // pink-400
}

function WinLineOverlay({ winLine, board }: { winLine: number[]; board: (string | null)[] }) {
  const [a, , c] = winLine
  const mark = board[a]!
  const color = MARK_COLORS[mark] || '#fff'

  const x1 = (a % 3) + 0.5
  const y1 = Math.floor(a / 3) + 0.5
  const x2 = (c % 3) + 0.5
  const y2 = Math.floor(c / 3) + 0.5

  // Extend line slightly past cell centers
  const dx = (x2 - x1) * 0.15
  const dy = (y2 - y1) * 0.15

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 3 3"
    >
      <line
        x1={x1 - dx} y1={y1 - dy}
        x2={x2 + dx} y2={y2 + dy}
        stroke={color}
        strokeWidth={0.12}
        strokeLinecap="round"
        opacity={0.9}
      />
    </svg>
  )
}

export function TicTacToeBoard({
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
  const isMyTurn = state.currentTurn === playerId
  const myMark = state.players.X === playerId ? 'X' : 'O'
  const finished = gameStatus?.finished

  return (
    <div className="flex flex-col items-center gap-4">
      {!finished && (
        <p className="text-white text-lg">
          {isMyTurn ? 'Your turn!' : "Opponent\u2019s turn..."}
          {' '}You are <span className="font-bold">{myMark}</span>
        </p>
      )}
      <div className="relative">
        <div className="grid grid-cols-3 w-72 h-72 border-collapse">
          {state.board.map((cell: string | null, i: number) => {
            const col = i % 3
            const row = Math.floor(i / 3)
            return (
              <button
                key={i}
                onClick={() => !finished && isMyTurn && !cell && onMove({ position: i })}
                disabled={!!finished || !isMyTurn || !!cell}
                className={`aspect-square text-4xl font-bold text-white
                  flex items-center justify-center
                  ${col < 2 ? 'border-r-2 border-r-white/40' : ''}
                  ${row < 2 ? 'border-b-2 border-b-white/40' : ''}
                  ${!finished && isMyTurn && !cell ? 'hover:bg-white/10 cursor-pointer' : 'cursor-default'}
                  ${cell === 'X' ? 'text-yellow-400' : cell === 'O' ? 'text-pink-400' : ''}`}
              >
                {cell ?? '\u00A0'}
              </button>
            )
          })}
        </div>
        {gameStatus?.winLine && (
          <WinLineOverlay winLine={gameStatus.winLine} board={state.board} />
        )}
      </div>
    </div>
  )
}
