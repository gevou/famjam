'use server'

import { createClient } from '@/lib/supabase/server'

async function leaveOtherRooms(supabase: any, playerId: string) {
  // Find all active rooms this player is in
  const { data: currentEntries } = await supabase
    .from('room_players')
    .select('room_id, rooms!inner(status)')
    .eq('player_id', playerId)
    .in('rooms.status', ['waiting', 'playing'])

  if (currentEntries?.length) {
    const roomIds = currentEntries.map((e: any) => e.room_id)
    await supabase
      .from('room_players')
      .delete()
      .eq('player_id', playerId)
      .in('room_id', roomIds)
  }
}

export async function createRoom(formData: FormData) {
  const supabase = await createClient()
  const gameType = formData.get('gameType') as string
  const maxPlayers = parseInt(formData.get('maxPlayers') as string)
  const playerId = formData.get('playerId') as string

  // Get player's family
  const { data: player } = await supabase
    .from('players')
    .select('family_id')
    .eq('id', playerId)
    .single()

  if (!player) throw new Error('Player not found')

  // Leave any other active rooms first
  await leaveOtherRooms(supabase, playerId)

  const { data: room } = await supabase
    .from('rooms')
    .insert({
      family_id: player.family_id,
      game_type: gameType,
      max_players: maxPlayers,
      created_by: playerId,
    })
    .select()
    .single()

  if (!room) throw new Error('Failed to create room')

  // Join the creator to the room
  await supabase.from('room_players').insert({
    room_id: room.id,
    player_id: playerId,
    seat_number: 0,
  })

  return room.id
}

export async function leaveRoom(roomId: string, playerId: string) {
  const supabase = await createClient()

  await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId)
}

export async function joinRoom(roomId: string, playerId: string) {
  const supabase = await createClient()

  // Leave any other active rooms first
  await leaveOtherRooms(supabase, playerId)

  // Count current players
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)

  await supabase.from('room_players').insert({
    room_id: roomId,
    player_id: playerId,
    seat_number: count || 0,
  })

  return roomId
}
