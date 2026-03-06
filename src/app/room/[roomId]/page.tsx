'use client'

import { use, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { useFamily } from '@/lib/hooks/use-family'
import { useGameRoom } from '@/lib/hooks/use-game-room'
import { useBotPlayer } from '@/lib/hooks/use-bot-player'
import { BOT_PLAYER_ID } from '@/lib/games/bot-ai'
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
  const { isAdmin } = useFamily()
  const [isActivePlayerParent, setIsActivePlayerParent] = useState(false)
  const { gameState, room, players, makeMove, startGame, onDataMessage, setSendData } = useGameRoom(roomId, playerId || '')

  useEffect(() => {
    if (!playerId) return
    const supabase = createClient()
    supabase.from('players').select('is_parent').eq('id', playerId).single()
      .then(({ data }) => { if (data) setIsActivePlayerParent(data.is_parent) })
  }, [playerId])
  const router = useRouter()

  // Bot state — auto-detect from game state if computer is a player
  const [botEnabled, setBotEnabled] = useState(false)

  useEffect(() => {
    if (!gameState) return
    const hasBot =
      (gameState.players && (gameState.players.X === BOT_PLAYER_ID || gameState.players.O === BOT_PLAYER_ID)) ||
      (gameState.playerOrder && gameState.playerOrder.includes(BOT_PLAYER_ID))
    if (hasBot) setBotEnabled(true)
  }, [gameState])

  // Auto-play bot moves (only admin runs this)
  useBotPlayer(gameState, room?.game_type ?? null, makeMove, botEnabled && isAdmin)

  // Splash state
  const [showSplash, setShowSplash] = useState(false)
  const [splashVariant, setSplashVariant] = useState(0)
  const splashShownRef = useRef(false)

  // Handle startGame and reset splash
  const handleStartGame = useCallback(() => {
    setShowSplash(false)
    splashShownRef.current = false
    startGame(botEnabled ? [BOT_PLAYER_ID] : undefined)
  }, [startGame, botEnabled])

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

  const topBar = (
    <div className="flex justify-between items-center">
      <button
        onClick={handleLeave}
        className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/50 transition"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <PlayerBanner />
    </div>
  )

  const gameBoard = (
    <div className="flex flex-col items-center relative">
      {/* Board — always shown (faded preview when not playing, active when playing) */}
      {BoardComponent && (
        <div className={!gameState ? 'opacity-40 pointer-events-none' : ''}>
          <BoardComponent
            state={gameState || (room ? getGame(room.game_type).initialState(
              players.length > 0
                ? players.map((rp: any) => rp.players.id)
                : [playerId]
            ) : null)}
            playerId={playerId}
            onMove={gameState ? makeMove : () => {}}
            gameStatus={gameStatus}
            players={players}
            botEnabled={botEnabled}
          />
        </div>
      )}

      {/* Pre-game overlay */}
      {!gameState && room && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl max-w-xs mx-4">
            <div className="flex gap-3 justify-center flex-wrap">
              {players.map((rp: any) => (
                <div key={rp.player_id} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                    {rp.players.characters?.image_url ? (
                      <img src={rp.players.characters.image_url} alt="" className="w-8 h-8" />
                    ) : (
                      <span className="text-white/60 font-bold">{rp.players.display_name[0]}</span>
                    )}
                  </div>
                  <span className="text-white/70 text-xs">{rp.players.display_name}</span>
                </div>
              ))}
              {botEnabled && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <span className="text-xl">🤖</span>
                  </div>
                  <span className="text-blue-300/70 text-xs">Computer</span>
                </div>
              )}
            </div>

            {isAdmin && room.game_type !== 'monopoly' && (
              <button
                onClick={() => setBotEnabled(!botEnabled)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  botEnabled
                    ? 'bg-blue-500/30 text-blue-200 hover:bg-blue-500/40'
                    : 'bg-white/10 text-white/50 hover:bg-white/20'
                }`}
              >{botEnabled ? 'Remove Computer' : '+ Computer'}</button>
            )}

            {(players.length + (botEnabled ? 1 : 0)) >= getGame(room.game_type).minPlayers ? (
              <button
                onClick={handleStartGame}
                className="bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 px-10 py-3 rounded-2xl text-lg font-bold shadow-lg transition-transform active:scale-95"
              >Start Game!</button>
            ) : (
              <p className="text-white/50 text-sm">
                Waiting for players... ({players.length + (botEnabled ? 1 : 0)}/{getGame(room.game_type).minPlayers})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Post-game overlay */}
      {finished && !showSplash && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-black/60 backdrop-blur-lg rounded-3xl p-6 flex flex-col items-center gap-3 shadow-2xl max-w-xs mx-4">
            <h2 className="text-2xl font-bold text-white">
              {gameStatus?.winner
                ? gameStatus.winner === playerId ? '🎉 You win!' : `${winnerName} wins!`
                : '🤝 Draw!'}
            </h2>
            {gameStatus?.scores && (
              <div className="flex gap-3 text-white/70 text-sm">
                {Object.entries(gameStatus.scores).map(([pid, score]) => (
                  <span key={pid}>
                    {players.find((rp: any) => rp.players.id === pid)?.players?.display_name}: {score as number}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={handleStartGame}
              className="bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-gray-900 px-10 py-3 rounded-2xl text-lg font-bold shadow-lg transition-transform active:scale-95 mt-1"
            >Play Again</button>
          </div>
        </div>
      )}
    </div>
  )

  // Add synthetic bot player entry for video strip
  const displayPlayers = botEnabled && gameState
    ? [
        ...players,
        {
          player_id: BOT_PLAYER_ID,
          players: { id: BOT_PLAYER_ID, display_name: 'Computer', character_id: null, characters: null },
        },
      ]
    : players

  const videoStrip = (
    <VideoChat
      roomId={roomId}
      playerId={playerId}
      playerName={playerName}
      activeTurnPlayerId={gameState?.currentTurn}
      roomPlayers={displayPlayers}
      onDataMessage={onDataMessage}
      setSendData={setSendData}
      playerEffects={playerEffects}
      isParent={isActivePlayerParent}
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
