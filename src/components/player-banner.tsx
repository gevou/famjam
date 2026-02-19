'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useActivePlayer } from '@/lib/hooks/use-active-player'

type PlayerInfo = {
  display_name: string
  characters: { image_url: string } | null
}

export function PlayerBanner() {
  const playerId = useActivePlayer()
  const [player, setPlayer] = useState<PlayerInfo | null>(null)

  useEffect(() => {
    if (!playerId) return
    const supabase = createClient()
    supabase
      .from('players')
      .select('display_name, characters(image_url)')
      .eq('id', playerId)
      .single()
      .then(({ data }) => { if (data) setPlayer(data as any) })
  }, [playerId])

  if (!player) return null

  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
      {player.characters?.image_url && (
        <img src={player.characters.image_url} alt="" className="w-6 h-6" />
      )}
      <span className="text-white text-sm font-semibold">{player.display_name}</span>
    </div>
  )
}
