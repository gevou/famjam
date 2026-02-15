'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFamily } from '@/lib/hooks/use-family'
import { AddMemberDialog } from './add-member-dialog'

export default function HomePage() {
  const { players, loading } = useFamily()
  const [showAddMember, setShowAddMember] = useState(false)
  const router = useRouter()

  function selectPlayer(playerId: string) {
    // Store active player in sessionStorage (per-tab, supports multi-device)
    sessionStorage.setItem('activePlayerId', playerId)
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
