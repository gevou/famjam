'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useActivePlayer } from '@/lib/hooks/use-active-player'
import { listGames } from '@/lib/games/registry'
import { createRoom, joinRoom } from '@/app/actions/rooms'
import { PlayerBanner } from '@/components/player-banner'
import Link from 'next/link'

type RoomPlayer = { player_id: string; players: { id: string; display_name: string; characters: { image_url: string } | null } }

type Room = {
  id: string
  game_type: string
  max_players: number
  status: string
  created_by: string
  players: { display_name: string }
  room_players: RoomPlayer[]
}

type LobbyPresence = { playerId: string; displayName: string; imageUrl: string }

export default function LobbyPage() {
  const playerId = useActivePlayer()
  const [rooms, setRooms] = useState<Room[]>([])
  const [lobbyPeers, setLobbyPeers] = useState<LobbyPresence[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const allGames = listGames()
  const games = allGames.filter(g => !g.adminOnly || isAdmin)

  // Lobby presence via Supabase presence channel
  useEffect(() => {
    if (!playerId) return

    let presenceChannel: ReturnType<typeof supabase.channel> | null = null

    async function joinPresence() {
      const { data: me } = await supabase
        .from('players')
        .select('display_name, characters(image_url)')
        .eq('id', playerId)
        .single()

      if (!me) return

      const ch = supabase.channel('lobby-presence')

      ch.on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<LobbyPresence>()
        const peers: LobbyPresence[] = []
        for (const key of Object.keys(state)) {
          for (const p of state[key]) {
            if (p.playerId !== playerId) peers.push(p)
          }
        }
        setLobbyPeers(peers)
      })

      await ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({
            playerId,
            displayName: me.display_name,
            imageUrl: (me.characters as any)?.image_url || '',
          })
        }
      })

      presenceChannel = ch
    }

    joinPresence()
    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel)
    }
  }, [playerId])

  // Room data loading
  useEffect(() => {
    if (!playerId) return

    let familyId: string | null = null

    async function loadAll() {
      if (!familyId) {
        const { data: player } = await supabase
          .from('players')
          .select('family_id, is_admin')
          .eq('id', playerId)
          .single()
        if (!player) return
        familyId = player.family_id
        setIsAdmin(player.is_admin ?? false)
      }

      const { data } = await supabase
        .from('rooms')
        .select('*, players!rooms_created_by_fkey(display_name), room_players(player_id, players(id, display_name, characters(image_url)))')
        .eq('family_id', familyId)
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false })

      if (data) setRooms(data as any)
    }

    loadAll()

    // Poll every 3s as reliable fallback
    const poll = setInterval(loadAll, 3000)

    // Also subscribe to realtime for instant updates when available
    const channel = supabase
      .channel('lobby-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, () => loadAll())
      .subscribe()

    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
            >
              &larr; Home
            </Link>
            <h1 className="text-3xl font-bold text-white">Game Lobby</h1>
          </div>
          <div className="flex items-center gap-1">
            {lobbyPeers.map((peer) => (
              <div key={peer.playerId} className="relative group">
                <img
                  src={peer.imageUrl}
                  alt={peer.displayName}
                  className="w-8 h-8 rounded-full bg-white/10 p-0.5"
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/80 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  {peer.displayName}
                </div>
              </div>
            ))}
            <PlayerBanner />
          </div>
        </div>

        {/* Active rooms */}
        <div className="space-y-3 mb-8">
          {rooms.length === 0 && (
            <p className="text-indigo-200 text-center py-8">No active games. Start one!</p>
          )}
          {rooms.map((room) => (
            <div key={room.id} className="bg-white/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">
                  {games.find(g => g.id === room.game_type)?.name || room.game_type}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {room.room_players?.map((rp) => (
                    <div key={rp.player_id} className="flex items-center gap-1.5 bg-green-400/20 rounded-full px-2.5 py-1">
                      {rp.players?.characters?.image_url && (
                        <img src={rp.players.characters.image_url} alt="" className="w-5 h-5" />
                      )}
                      <span className="text-green-300 text-sm font-medium">{rp.players?.display_name}</span>
                    </div>
                  ))}
                  {room.room_players.length < room.max_players && (
                    <span className="text-indigo-300 text-sm">+{room.max_players - room.room_players.length} open</span>
                  )}
                </div>
              </div>
              {room.room_players?.some(rp => rp.player_id === playerId) ? (
                <button
                  onClick={() => router.push(`/room/${room.id}`)}
                  className="bg-green-400 text-gray-900 px-6 py-2 rounded-lg font-semibold"
                >
                  Enter
                </button>
              ) : room.room_players.length < room.max_players ? (
                <button
                  onClick={() => handleJoin(room.id)}
                  className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-semibold"
                >
                  Join
                </button>
              ) : null}
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
