'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFamily } from '@/lib/hooks/use-family'
import { createClient } from '@/lib/supabase/client'
import { requestNotificationPermission, sendBrowserNotification, subscribeToPush } from '@/lib/notifications'
import { AddMemberDialog } from './add-member-dialog'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function HomePage() {
  const { players, loading } = useFamily()
  const [showAddMember, setShowAddMember] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Request notification permission and register push for parents
  useEffect(() => {
    const parent = players.find(p => p.is_parent)
    if (parent) {
      requestNotificationPermission().then((granted) => {
        if (granted) subscribeToPush()
      })
    }
  }, [players])

  // Listen for kid login events and store channel ref for sending
  useEffect(() => {
    if (!players.length) return

    const channel = supabase
      .channel(`family-presence`)
      .on('broadcast', { event: 'player_login' }, (payload) => {
        const parent = players.find(p => p.is_parent)
        if (parent) {
          const { playerName } = payload.payload
          sendBrowserNotification('FamJam', `${playerName} just opened FamJam!`)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [players])

  function selectPlayer(playerId: string) {
    // Store active player in sessionStorage (per-tab, supports multi-device)
    sessionStorage.setItem('activePlayerId', playerId)

    // Broadcast login event for non-parent players
    const player = players.find(p => p.id === playerId)
    if (player && !player.is_parent && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_login',
        payload: { playerId, playerName: player.display_name },
      })
    }

    router.push('/lobby')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-8">
      <h1 className="text-3xl font-bold text-white text-center mb-8">Who&apos;s playing?</h1>
      <div className="max-w-lg mx-auto grid grid-cols-2 gap-6">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => selectPlayer(player.id)}
            className="bg-white/20 hover:bg-white/30 rounded-2xl p-6 text-center transition"
          >
            <img
              src={player.characters?.image_url}
              alt={player.characters?.name}
              className="w-20 h-20 mx-auto mb-3"
            />
            <p className="text-white text-xl font-semibold">{player.display_name}</p>
          </button>
        ))}
        <button
          onClick={() => setShowAddMember(true)}
          className="bg-white/10 hover:bg-white/20 rounded-2xl p-6 text-center border-2 border-dashed border-white/30 transition"
        >
          <div className="text-4xl text-white/60 mb-3">+</div>
          <p className="text-white/60 text-lg">Add player</p>
        </button>
      </div>
      {showAddMember && (
        <AddMemberDialog onClose={() => setShowAddMember(false)} />
      )}
    </div>
  )
}
