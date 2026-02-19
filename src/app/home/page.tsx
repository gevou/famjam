'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useFamily } from '@/lib/hooks/use-family'
import { createClient } from '@/lib/supabase/client'
import { requestNotificationPermission, sendBrowserNotification, subscribeToPush } from '@/lib/notifications'
import { updatePlayer } from '@/app/actions/family'
import { AddMemberDialog } from './add-member-dialog'
import type { RealtimeChannel } from '@supabase/supabase-js'

export default function HomePage() {
  const { players, isParent, loading, refresh } = useFamily()
  const [showAddMember, setShowAddMember] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCharacterId, setEditCharacterId] = useState('')
  const [characters, setCharacters] = useState<{ id: string; name: string; image_url: string }[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from('characters').select('*').then(({ data }) => {
      if (data) setCharacters(data)
    })
  }, [])
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

  async function savePlayer(playerId: string) {
    const trimmed = editName.trim()
    if (!trimmed) { setEditingId(null); return }
    const player = players.find(p => p.id === playerId)
    const nameChanged = player && trimmed !== player.display_name
    const charChanged = player && editCharacterId !== player.character_id
    if (nameChanged || charChanged) {
      await updatePlayer(playerId, trimmed, charChanged ? editCharacterId : undefined)
      await refresh()
    }
    setEditingId(null)
  }

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
          editingId === player.id ? (
            <div
              key={player.id}
              className="bg-white/30 rounded-2xl p-4 text-center space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-4 gap-1.5">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setEditCharacterId(char.id)}
                    className={`p-1.5 rounded-lg transition ${
                      editCharacterId === char.id ? 'ring-2 ring-white bg-white/30' : 'hover:bg-white/20'
                    }`}
                  >
                    <img src={char.image_url} alt={char.name} className="w-10 h-10 mx-auto" />
                  </button>
                ))}
              </div>
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') savePlayer(player.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="w-full bg-white/30 text-white text-xl font-semibold text-center rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-white/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 py-2 rounded-lg bg-white/10 text-white text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => savePlayer(player.id)}
                  className="flex-1 py-2 rounded-lg bg-white/30 text-white text-sm font-semibold"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <button
              key={player.id}
              onClick={() => selectPlayer(player.id)}
              className="bg-white/20 hover:bg-white/30 rounded-2xl p-6 text-center transition relative group"
            >
              <img
                src={player.characters?.image_url}
                alt={player.characters?.name}
                className="w-20 h-20 mx-auto mb-3"
              />
              <p className="text-white text-xl font-semibold">{player.display_name}</p>
              {isParent && (
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(player.id)
                    setEditName(player.display_name)
                    setEditCharacterId(player.character_id)
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-white text-sm transition-opacity"
                  title="Edit player"
                >
                  &#9998;
                </span>
              )}
            </button>
          )
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
