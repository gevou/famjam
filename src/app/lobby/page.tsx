'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { listGames } from '@/lib/games/registry'
import { createRoom, joinRoom } from '@/app/actions/rooms'
import Link from 'next/link'

type Room = {
  id: string
  game_type: string
  max_players: number
  status: string
  created_by: string
  players: { display_name: string }
  room_players: { player_id: string; players: { display_name: string; characters: { image_url: string } | null } }[]
}

export default function LobbyPage() {
  const playerId = useActivePlayer()
  const [rooms, setRooms] = useState<Room[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const games = listGames()

  useEffect(() => {
    if (!playerId) return

    // Load active rooms for this player's family
    async function loadRooms() {
      const { data: player } = await supabase
        .from('players')
        .select('family_id')
        .eq('id', playerId)
        .single()

      if (!player) return

      const { data } = await supabase
        .from('rooms')
        .select('*, players!rooms_created_by_fkey(display_name), room_players(player_id, players(display_name, characters(image_url)))')
        .eq('family_id', player.family_id)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false })

      if (data) setRooms(data as any)
    }

    loadRooms()

    // Subscribe to room changes
    const channel = supabase
      .channel('lobby')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        loadRooms()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, () => {
        loadRooms()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [playerId])

  async function handleCreate(formData: FormData) {
    formData.set('playerId', playerId!)
    const roomId = await createRoom(formData)
    router.push(`/room/${roomId}`)
  }

  async function handleJoin(roomId: string) {
    await joinRoom(roomId, playerId!)
    router.push(`/room/${roomId}`)
  }

  if (!playerId) {
    return <div className="min-h-screen flex items-center justify-center">
      <p>No player selected. <a href="/home" className="underline">Go back</a></p>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/home"
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
          >
            &larr; Home
          </Link>
          <h1 className="text-3xl font-bold text-white">Game Lobby</h1>
        </div>

        {/* Active rooms */}
        <div className="space-y-3 mb-8">
          {rooms.length === 0 && (
            <p className="text-indigo-200 text-center py-8">No active games. Start one!</p>
          )}
          {rooms.map((room) => (
            <div key={room.id} className="bg-white/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">
                  {games.find(g => g.id === room.game_type)?.name || room.game_type}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {room.room_players?.map((rp) => (
                    <div key={rp.player_id} className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-0.5">
                      {rp.players?.characters?.image_url && (
                        <img src={rp.players.characters.image_url} alt="" className="w-4 h-4" />
                      )}
                      <span className="text-indigo-100 text-xs">{rp.players?.display_name}</span>
                    </div>
                  ))}
                  {room.room_players.length < room.max_players && (
                    <span className="text-indigo-300 text-xs">+{room.max_players - room.room_players.length} needed</span>
                  )}
                </div>
              </div>
              {room.status === 'waiting' && !room.room_players?.some(rp => rp.player_id === playerId) && (
                <button
                  onClick={() => handleJoin(room.id)}
                  className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-semibold"
                >
                  Join
                </button>
              )}
              {room.room_players?.some(rp => rp.player_id === playerId) && (
                <button
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="bg-green-400 text-gray-900 px-6 py-2 rounded-lg font-semibold"
                >
                  Enter
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create room */}
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full bg-yellow-400 text-gray-900 py-4 rounded-xl text-lg font-bold"
        >
          Start a Game
        </button>

        {showCreate && (
          <form action={handleCreate} className="mt-4 bg-white/20 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-white mb-2">Game</label>
              <select name="gameType" className="w-full px-4 py-3 rounded-lg text-lg">
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white mb-2">Max players</label>
              <select name="maxPlayers" className="w-full px-4 py-3 rounded-lg text-lg">
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-green-400 text-gray-900 py-3 rounded-lg font-bold">
              Create Room
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
