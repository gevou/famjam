'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { useGameRoom } from '@/lib/hooks/use-game-room'
import { VideoChat } from '@/components/video-chat'
import { TicTacToeBoard } from '@/components/games/tic-tac-toe-board'
import { SOSBoard } from '@/components/games/sos-board'
import { MonopolyBoard } from '@/components/games/monopoly-board'
import { GameEndSplash } from '@/components/games/game-end-splash'
import { GameRoomLayout } from './game-room-layout'
import { getGame } from '@/lib/games/registry'
import { leaveRoom } from '@/app/actions/rooms'
import { PlayerBanner } from '@/components/player-banner'
import { pickVariant, classifyPlayers } from '@/lib/animations'

const BOARD_COMPONENTS: Record<string, any> = {
  'tic-tac-toe': TicTacToeBoard,
  'sos': SOSBoard,
  'monopoly': MonopolyBoard,
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const playerId = useActivePlayer()
  const { gameState, room, players, makeMove, startGame, onDataMessage, setSendData } = useGameRoom(roomId, playerId || '')
  const router = useRouter()

  // Splash state
  const [showSplash, setShowSplash] = useState(false)
  const [splashVariant, setSplashVariant] = useState(0)
  const splashShownRef = useRef(false)

  const handleLeave = useCallback(async () => {
    if (playerId) await leaveRoom(roomId, playerId)
    router.push('/lobby')
  }, [roomId, playerId, router])

  // Clean up on tab close / browser navigation
  useEffect(() => {
    if (!playerId) return
    const onBeforeUnload = () => {
      navigator.sendBeacon(`/api/leave-room?room=${roomId}&player=${playerId}`)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [roomId, playerId])

  if (!playerId) return <div className="h-dvh flex items-center justify-center text-white">No player selected</div>

  const currentPlayer = players.find((rp: any) => rp.players.id === playerId)
  const playerName = currentPlayer?.players?.display_name || 'Player'

  const gameStatus = gameState && room ? getGame(room.game_type).getStatus(gameState) : null
  const BoardComponent = room ? BOARD_COMPONENTS[room.game_type] : null

  // Trigger splash on game end
  const finished = gameStatus?.finished ?? false
  if (finished && !splashShownRef.current) {
    splashShownRef.current = true
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      setSplashVariant(pickVariant(3))
      setShowSplash(true)
    }, 0)
  }
  // Reset when starting a new game
  if (!finished && splashShownRef.current) {
    splashShownRef.current = false
  }

  // Player effects for video feeds
  const playerEffects: Record<string, 'winner' | 'loser'> = {}
  if (finished && gameState) {
    const { winnerId, loserIds } = classifyPlayers(gameStatus!, gameState.playerOrder || [])
    if (winnerId) playerEffects[winnerId] = 'winner'
    for (const lid of loserIds) playerEffects[lid] = 'loser'
  }

  const winnerName = gameStatus?.winner
    ? players.find((rp: any) => rp.players.id === gameStatus.winner)?.players?.display_name || 'Winner'
    : ''

  // Handle startGame and reset splash
  const handleStartGame = useCallback(() => {
    setShowSplash(false)
    splashShownRef.current = false
    startGame()
  }, [startGame])

  const topBar = (
    <div className="flex justify-between items-center">
      <button
        onClick={handleLeave}
        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition text-sm"
      >
        &larr; Leave
      </button>
      <span className="text-white/80 text-sm">{room ? getGame(room.game_type).name : '...'}</span>
      <PlayerBanner />
    </div>
  )

  const gameBoard = (
    <div className="flex flex-col items-center gap-2">
      {!gameState && (
        <div className="text-center space-y-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {players.map((rp: any) => (
              <span key={rp.player_id} className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                {rp.players.display_name}
              </span>
            ))}
          </div>
          {room && players.length >= getGame(room.game_type).minPlayers ? (
            <button
              onClick={handleStartGame}
              className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl text-lg font-bold"
            >
              Start Game!
            </button>
          ) : (
            <p className="text-white/70 text-sm">
              Waiting for players... ({players.length}/{room ? getGame(room.game_type).minPlayers : '?'})
            </p>
          )}
        </div>
      )}

      {!gameState && BoardComponent && room && (
        <div className="opacity-60 pointer-events-none">
          <BoardComponent
            state={getGame(room.game_type).initialState(
              players.length > 0
                ? players.map((rp: any) => rp.players.id)
                : [playerId]
            )}
            playerId={playerId}
            onMove={() => {}}
            gameStatus={null}
            players={players}
          />
        </div>
      )}

      {gameState && BoardComponent && (
        <BoardComponent state={gameState} playerId={playerId} onMove={makeMove} gameStatus={gameStatus} players={players} />
      )}

      {finished && !showSplash && (
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-white">
            {gameStatus?.winner
              ? gameStatus.winner === playerId ? 'You win!' : 'You lost!'
              : 'Draw!'}
          </h2>
          {gameStatus?.scores && (
            <div className="flex gap-4 justify-center text-white text-sm">
              {Object.entries(gameStatus.scores).map(([pid, score]) => (
                <span key={pid}>{players.find((rp: any) => rp.players.id === pid)?.players?.display_name}: {score as number}</span>
              ))}
            </div>
          )}
          <button
            onClick={handleStartGame}
            className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl text-lg font-bold"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )

  const videoStrip = (
    <VideoChat
      roomId={roomId}
      playerId={playerId}
      playerName={playerName}
      activeTurnPlayerId={gameState?.currentTurn}
      roomPlayers={players}
      onDataMessage={onDataMessage}
      setSendData={setSendData}
      playerEffects={playerEffects}
    />
  )

  const splash = showSplash ? (
    <GameEndSplash
      isWinner={gameStatus?.winner === playerId}
      variantIndex={splashVariant}
      winnerName={winnerName}
      onComplete={() => setShowSplash(false)}
    />
  ) : undefined

  return (
    <GameRoomLayout
      topBar={topBar}
      gameBoard={gameBoard}
      videoStrip={videoStrip}
      splash={splash}
    />
  )
}
