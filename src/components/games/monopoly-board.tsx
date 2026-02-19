'use client'

import { useState, useCallback } from 'react'
import type { GameState, GameStatus, Move } from '@/lib/games/types'
import { BOARD, MAGIC_CARDS, type MonopolyState, type BoardSpace } from '@/lib/games/monopoly'
import { THEMES, DEFAULT_THEME, THEME_IDS, type MonopolyTheme } from '@/lib/games/monopoly-themes'

const PLAYER_COLORS = ['#d97706', '#db2777', '#059669', '#2563eb']
const PLAYER_BG    = ['#fef3c7', '#fce7f3', '#d1fae5', '#dbeafe']

// Special space palettes
const SPACE_STYLE: Record<string, { bg: string; text: string }> = {
  start: { bg: '#fff9c4', text: '#f57f17' },
  magic: { bg: '#f3e5f5', text: '#7b1fa2' },
  troll: { bg: '#ffebee', text: '#c62828' },
  lucky: { bg: '#e8f5e9', text: '#2e7d32' },
  rest:  { bg: '#e0f2f1', text: '#00695c' },
}

// 7x7 grid, 24 perimeter cells
function getGridPosition(index: number): { row: number; col: number } {
  if (index <= 6)  return { row: 6, col: index }
  if (index <= 11) return { row: 6 - (index - 6), col: 6 }
  if (index <= 18) return { row: 0, col: 6 - (index - 12) }
  return { row: index - 18, col: 0 }
}

function DieIcon({ value, rolling }: { value: number | null; rolling: boolean }) {
  const dots: Record<number, string> = {
    1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
  }
  return (
    <span className={`text-5xl ${rolling ? 'animate-bounce' : ''}`}>
      {value ? dots[value] : '🎲'}
    </span>
  )
}

function getThemedSpace(space: BoardSpace, theme: MonopolyTheme): { name: string; emoji: string } {
  // For properties and special spaces, overlay theme visuals
  const themeSpace = theme.spaces[space.index]
  if (themeSpace) {
    return themeSpace
  }
  // Special spaces get themed emojis
  if (space.type !== 'property') {
    const emoji = theme.specialEmojis[space.type as keyof typeof theme.specialEmojis]
    return { name: space.name, emoji: emoji || space.emoji }
  }
  return { name: space.name, emoji: space.emoji }
}

function SpaceCell({
  space,
  theme,
  property,
  playersHere,
  playerColors,
  isHighlighted,
  playerAvatars,
}: {
  space: BoardSpace
  theme: MonopolyTheme
  property?: { owner: string; upgraded: boolean }
  playersHere: { id: string; colorIndex: number }[]
  playerColors: Record<string, string>
  isHighlighted: boolean
  playerAvatars: Record<string, string>
}) {
  const groupStyle = space.group ? theme.groups[space.group] : null
  const special = SPACE_STYLE[space.type]
  const bgColor = groupStyle?.bg || special?.bg || '#ffffff'
  const labelColor = groupStyle?.text || special?.text || '#555'
  const themed = getThemedSpace(space, theme)

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-0.5 text-center ${
        isHighlighted ? 'ring-2 ring-amber-400 ring-inset z-10 bg-amber-50' : ''
      }`}
      style={{
        backgroundColor: isHighlighted ? undefined : bgColor,
        borderRight: '1px solid #d1d5db',
        borderBottom: '1px solid #d1d5db',
      }}
    >
      {/* Group color bar */}
      {groupStyle && (
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: groupStyle.bar }} />
      )}

      {/* Upgrade star */}
      {property?.upgraded && (
        <div className="absolute top-0 right-0 text-[10px] leading-none">⭐</div>
      )}

      {/* Ownership dot */}
      {property && !property.upgraded && (
        <div
          className="absolute top-[2px] right-[2px] w-2 h-2 rounded-full"
          style={{ backgroundColor: playerColors[property.owner], boxShadow: '0 0 0 1px white' }}
        />
      )}

      <span className="text-lg leading-none drop-shadow-sm">{themed.emoji}</span>

      <span className="text-[8px] font-semibold leading-tight mt-px truncate w-full px-px" style={{ color: labelColor }}>
        {space.type === 'property' ? themed.name.split(' ').pop() : space.type === 'start' ? 'GO' : ''}
      </span>

      {/* Price */}
      {space.type === 'property' && !property && (
        <span className="text-[7px] font-medium" style={{ color: labelColor + '99' }}>{space.price}🪙</span>
      )}

      {/* Player tokens */}
      {playersHere.length > 0 && (
        <div className="flex gap-px mt-px">
          {playersHere.map((p) =>
            playerAvatars[p.id] ? (
              <img
                key={p.id}
                src={playerAvatars[p.id]}
                alt=""
                className="w-6 h-6 rounded-full shadow"
                style={{ outline: `2px solid ${PLAYER_COLORS[p.colorIndex]}` }}
              />
            ) : (
              <div
                key={p.id}
                className="w-6 h-6 rounded-full shadow"
                style={{ backgroundColor: PLAYER_COLORS[p.colorIndex], outline: '1px solid white' }}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

export function MonopolyBoard({
  state,
  playerId,
  onMove,
  gameStatus,
  players,
}: {
  state: GameState
  playerId: string
  onMove: (move: Move) => void
  gameStatus?: GameStatus | null
  players?: any[]
}) {
  const s = state as MonopolyState
  const [rolling, setRolling] = useState(false)
  const [themeId, setThemeId] = useState(DEFAULT_THEME)
  const activeTheme = THEMES[themeId]
  const isMyTurn = s.currentTurn === playerId
  const finished = s.phase === 'finished'

  const playerColors: Record<string, string> = {}
  const playerNames: Record<string, string> = {}
  const playerAvatars: Record<string, string> = {}
  s.playerOrder.forEach((pid, i) => {
    playerColors[pid] = PLAYER_COLORS[i]
    const rp = players?.find((p: any) => p.players?.id === pid)
    playerNames[pid] = pid === playerId ? 'You' : (rp?.players?.display_name || pid.slice(0, 8))
    if (rp?.players?.characters?.image_url) {
      playerAvatars[pid] = rp.players.characters.image_url
    }
  })

  const handleRoll = useCallback(() => {
    if (!isMyTurn || s.phase !== 'roll' || rolling) return
    setRolling(true)
    const die = Math.floor(Math.random() * 6) + 1
    setTimeout(() => {
      setRolling(false)
      onMove({ action: 'roll', die })
    }, 600)
  }, [isMyTurn, s.phase, rolling, onMove])

  const grid: (BoardSpace | null)[][] = Array.from({ length: 7 }, () => Array(7).fill(null))
  for (const space of BOARD) {
    const { row, col } = getGridPosition(space.index)
    grid[row][col] = space
  }

  const playersAtPos: Record<number, { id: string; colorIndex: number }[]> = {}
  for (const [pid, pos] of Object.entries(s.positions)) {
    if (!playersAtPos[pos]) playersAtPos[pos] = []
    playersAtPos[pos].push({ id: pid, colorIndex: s.playerOrder.indexOf(pid) })
  }

  const myPos = s.positions[playerId]
  const currentSpace = BOARD[myPos]
  const currentSpaceThemed = getThemedSpace(currentSpace, activeTheme)
  const magicCard = s.magicCardIndex !== null ? MAGIC_CARDS[s.magicCardIndex] : null

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Theme toggle + Scoreboard */}
      <div className="flex gap-2 flex-wrap justify-center items-center">
        <div className="flex bg-white/10 rounded-full p-0.5 gap-0.5">
          {THEME_IDS.map((tid) => (
            <button
              key={tid}
              onClick={() => setThemeId(tid)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition ${
                themeId === tid
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              {THEMES[tid].emoji} {THEMES[tid].label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {s.playerOrder.map((pid, i) => (
          <div
            key={pid}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
              s.currentTurn === pid ? 'ring-2 ring-offset-1 ring-offset-indigo-500' : ''
            }`}
            style={{ backgroundColor: PLAYER_BG[i], color: PLAYER_COLORS[i], outlineColor: PLAYER_COLORS[i] }}
          >
            {playerAvatars[pid] ? (
              <img src={playerAvatars[pid]} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[i] }} />
            )}
            <span>{playerNames[pid]}</span>
            <span className="font-bold">{s.coins[pid]} 🪙</span>
          </div>
        ))}
      </div>

      <p className="text-white/60 text-xs font-medium">First to {s.targetCoins} coins wins!</p>

      {/* Board */}
      <div
        className="grid grid-cols-7 w-full max-w-md aspect-square rounded-lg overflow-hidden shadow-lg"
        style={{ border: '2px solid #374151', backgroundColor: '#f0fdf4' }}
      >
        {grid.map((row, r) =>
          row.map((space, c) => {
            if (!space) {
              // Center of board — theme label area
              const isCenter = r === 3 && c === 3
              return (
                <div
                  key={`${r}-${c}`}
                  className={isCenter ? 'flex items-center justify-center' : ''}
                  style={{ backgroundColor: '#f0fdf4' }}
                >
                  {isCenter && (
                    <span className="text-[10px] font-bold text-emerald-700/40 text-center leading-tight whitespace-pre-line">
                      {activeTheme.centerLabel}
                    </span>
                  )}
                </div>
              )
            }
            return (
              <SpaceCell
                key={space.index}
                space={space}
                theme={activeTheme}
                property={s.properties[space.index]}
                playersHere={playersAtPos[space.index] || []}
                playerColors={playerColors}
                playerAvatars={playerAvatars}
                isHighlighted={space.index === myPos && isMyTurn}
              />
            )
          })
        )}
      </div>

      {/* Event toast */}
      {s.lastEvent && !finished && (
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl px-5 py-2.5 text-white text-center text-sm font-medium shadow-lg max-w-xs">
          {s.lastEvent}
          {s.passedStart && <div className="text-yellow-300 text-xs mt-1 font-semibold">+5 coins for passing GO!</div>}
        </div>
      )}

      {magicCard && s.currentTurn !== playerId && (
        <div className="bg-purple-900/70 backdrop-blur-sm rounded-xl px-5 py-2.5 text-purple-100 text-center text-sm font-medium shadow-lg">
          ✨ {magicCard.text}
        </div>
      )}

      {/* Actions */}
      {!finished && (
        <div className="flex flex-col items-center gap-2">
          {s.phase === 'roll' && isMyTurn && (
            <button
              onClick={handleRoll}
              disabled={rolling}
              className="flex flex-col items-center gap-1 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-gray-900 px-10 py-3 rounded-2xl font-bold text-lg shadow-md transition disabled:opacity-50"
            >
              <DieIcon value={s.diceRoll} rolling={rolling} />
              {rolling ? 'Rolling...' : 'Roll!'}
            </button>
          )}

          {s.phase === 'roll' && !isMyTurn && (
            <div className="text-white/60 text-sm flex items-center gap-2">
              <DieIcon value={s.diceRoll} rolling={false} />
              <span>Waiting for other player...</span>
            </div>
          )}

          {s.phase === 'buy' && isMyTurn && (
            <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
              <p className="text-white font-medium">{currentSpaceThemed.emoji} Buy {currentSpaceThemed.name} for {currentSpace.price} coins?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => onMove({ action: 'buy' })}
                  className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition"
                >
                  Buy! 🪙{currentSpace.price}
                </button>
                <button
                  onClick={() => onMove({ action: 'skip' })}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-2.5 rounded-xl font-medium transition"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {s.phase === 'upgrade' && isMyTurn && (
            <div className="flex flex-col items-center gap-2 bg-white/10 backdrop-blur rounded-2xl px-5 py-3">
              <p className="text-white font-medium">{currentSpaceThemed.emoji} Upgrade {currentSpaceThemed.name}?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => onMove({ action: 'upgrade' })}
                  className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition"
                >
                  Upgrade! ⭐ 🪙{currentSpace.price}
                </button>
                <button
                  onClick={() => onMove({ action: 'skip' })}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-2.5 rounded-xl font-medium transition"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
