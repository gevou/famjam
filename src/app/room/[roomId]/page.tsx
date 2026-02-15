'use client'

import { use } from 'react'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { useGameRoom } from '@/lib/hooks/use-game-room'
import { VideoChat } from '@/components/video-chat'
import { TicTacToeBoard } from '@/components/games/tic-tac-toe-board'
import { SOSBoard } from '@/components/games/sos-board'
import { getGame } from '@/lib/games/registry'

const BOARD_COMPONENTS: Record<string, any> = {
  'tic-tac-toe': TicTacToeBoard,
  'sos': SOSBoard,
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const playerId = useActivePlayer()
  const { gameState, room, players, makeMove, startGame } = useGameRoom(roomId, playerId || '')

  if (!playerId) return <div className="min-h-screen flex items-center justify-center text-white">No player selected</div>

  const currentPlayer = players.find((rp: any) => rp.players.id === playerId)
  const playerName = currentPlayer?.players?.display_name || 'Player'

  const gameStatus = gameState && room ? getGame(room.game_type).getStatus(gameState) : null
  const BoardComponent = room ? BOARD_COMPONENTS[room.game_type] : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <VideoChat
          roomId={roomId}
          playerId={playerId}
          playerName={playerName}
          activeTurnPlayerId={gameState?.currentTurn}
        />

        {!gameState && (
          <div className="text-center space-y-4">
            <p className="text-white text-lg">
              Waiting for players... ({players.length}/{room?.max_players || '?'})
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {players.map((rp: any) => (
                <span key={rp.player_id} className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                  {rp.players.display_name}
                </span>
              ))}
            </div>
            {players.length >= (room?.max_players || 2) && (
              <button
                onClick={startGame}
                className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl text-lg font-bold"
              >
                Start Game!
              </button>
            )}
          </div>
        )}

        {gameState && !gameStatus?.finished && BoardComponent && (
          <BoardComponent state={gameState} playerId={playerId} onMove={makeMove} />
        )}

        {gameStatus?.finished && (
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-white">
              {gameStatus.winner
                ? gameStatus.winner === playerId ? 'You win!' : 'You lost!'
                : 'Draw!'}
            </h2>
            {gameStatus.scores && (
              <div className="flex gap-4 justify-center text-white">
                {Object.entries(gameStatus.scores).map(([pid, score]) => (
                  <span key={pid}>{players.find((rp: any) => rp.players.id === pid)?.players.display_name}: {score as number}</span>
                ))}
              </div>
            )}
            <button
              onClick={startGame}
              className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-xl text-lg font-bold"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
