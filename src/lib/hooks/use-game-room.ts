'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGame } from '@/lib/games/registry'
import type { GameState, Move } from '@/lib/games/types'

export type DataMessage = {
  event: 'move' | 'game_start'
  payload: any
}

export type SendDataFn = (msg: DataMessage) => void

export function useGameRoom(roomId: string, playerId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [room, setRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const supabase = createClient()
  const sendDataRef = useRef<SendDataFn | null>(null)
  const lastMoveAt = useRef<number>(0)

  // Reusable loaders
  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('room_players')
      .select('*, players(id, display_name, character_id, is_parent, characters(name, image_url))')
      .eq('room_id', roomId)
      .order('seat_number')
    if (data) setPlayers(data)
  }, [roomId, supabase])

  const loadGameState = useCallback(async () => {
    const { data } = await supabase
      .from('game_states')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle()
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

    // Poll for data as fallback (still useful for player list updates)
    const pollInterval = setInterval(() => {
      loadPlayers()
      if (Date.now() - lastMoveAt.current > 5000) {
        loadGameState()
      }
    }, 3000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [roomId, playerId])

  // Called by VideoChat when it receives a data message from LiveKit
  const onDataMessage = useCallback((msg: DataMessage) => {
    if (msg.event === 'move') {
      setGameState(msg.payload.state)
    } else if (msg.event === 'game_start') {
      setGameState(msg.payload.state)
      loadRoom()
    }
  }, [loadRoom])

  // Register the send function (set by VideoChat from inside LiveKitRoom context)
  const setSendData = useCallback((fn: SendDataFn) => {
    sendDataRef.current = fn
  }, [])

  const makeMove = useCallback(async (move: Move, asPlayerId?: string) => {
    if (!gameState || !room) return

    const effectivePlayerId = asPlayerId || playerId
    const game = getGame(room.game_type)
    if (!game.validateMove(gameState, effectivePlayerId, move)) return

    const newState = game.applyMove(gameState, effectivePlayerId, move)
    setGameState(newState)
    lastMoveAt.current = Date.now()

    // Send via LiveKit data channel
    sendDataRef.current?.({
      event: 'move',
      payload: { state: newState, move, playerId: effectivePlayerId },
    })

    // Persist to database
    await supabase.from('game_states').upsert({
      room_id: roomId,
      state_json: newState,
      current_turn_player_id: game.getNextPlayer(newState),
      updated_at: new Date().toISOString(),
    })

    await supabase.from('moves').insert({
      room_id: roomId,
      player_id: effectivePlayerId,
      move_json: move,
    })

    // Mark room as finished when game ends
    const status = game.getStatus(newState)
    if (status.finished) {
      await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId)
    }
  }, [gameState, room, playerId, roomId, supabase])

  const startGame = useCallback(async (extraPlayerIds?: string[]) => {
    if (!room || !players.length) return

    const game = getGame(room.game_type)
    const playerIds = [
      ...players.map((rp: any) => rp.players.id),
      ...(extraPlayerIds || []),
    ]
    const initialState = game.initialState(playerIds)

    setGameState(initialState)
    lastMoveAt.current = Date.now()

    // Send via LiveKit data channel
    sendDataRef.current?.({
      event: 'game_start',
      payload: { state: initialState },
    })

    await supabase.from('game_states').upsert({
      room_id: roomId,
      state_json: initialState,
      current_turn_player_id: game.getNextPlayer(initialState),
    })

    await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId)
  }, [room, players, roomId, supabase])

  return { gameState, room, players, makeMove, startGame, onDataMessage, setSendData }
}
