'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGame } from '@/lib/games/registry'
import type { GameState, Move } from '@/lib/games/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useGameRoom(roomId: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [room, setRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Reusable loaders
  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('room_players')
      .select('*, players(id, display_name, character_id, characters(name, image_url))')
      .eq('room_id', roomId)
      .order('seat_number')
    if (data) setPlayers(data)
  }, [roomId, supabase])

  const loadGameState = useCallback(async () => {
    const { data } = await supabase
      .from('game_states')
      .select('*')
      .eq('room_id', roomId)
      .single()
    if (data) setGameState(data.state_json)
  }, [roomId, supabase])

  const loadRoom = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    if (data) setRoom(data)
  }, [roomId, supabase])

  useEffect(() => {
    loadRoom()
    loadPlayers()
    loadGameState()

    const channel = supabase.channel(`room:${roomId}`)
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        setGameState(payload.state)
      })
      .on('broadcast', { event: 'game_start' }, ({ payload }) => {
        setGameState(payload.state)
        loadRoom() // refresh room status
      })
      .on('broadcast', { event: 'player_joined' }, () => {
        loadPlayers()
      })
      .subscribe()

    channelRef.current = channel

    // Poll for player joins every 3s as fallback
    const pollInterval = setInterval(() => {
      loadPlayers()
      loadGameState()
    }, 3000)

    return () => {
      channelRef.current = null
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [roomId])

  const makeMove = useCallback(async (move: Move) => {
    if (!gameState || !room) return

    const game = getGame(room.game_type)
    if (!game.validateMove(gameState, playerId, move)) return

    const newState = game.applyMove(gameState, playerId, move)
    setGameState(newState)

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'move',
        payload: { state: newState, move, playerId },
      })
    }

    await supabase.from('game_states').upsert({
      room_id: roomId,
      state_json: newState,
      current_turn_player_id: game.getNextPlayer(newState),
      updated_at: new Date().toISOString(),
    })

    await supabase.from('moves').insert({
      room_id: roomId,
      player_id: playerId,
      move_json: move,
    })
  }, [gameState, room, playerId, roomId, supabase])

  const startGame = useCallback(async () => {
    if (!room || !players.length) return

    const game = getGame(room.game_type)
    const playerIds = players.map((rp: any) => rp.players.id)
    const initialState = game.initialState(playerIds)

    setGameState(initialState)

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { state: initialState },
      })
    }

    await supabase.from('game_states').upsert({
      room_id: roomId,
      state_json: initialState,
      current_turn_player_id: game.getNextPlayer(initialState),
    })

    await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
  }, [room, players, roomId, supabase])

  return { gameState, room, players, makeMove, startGame }
}
