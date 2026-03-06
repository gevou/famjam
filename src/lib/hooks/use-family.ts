'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Player = {
  id: string
  display_name: string
  character_id: string
  is_parent: boolean
  characters: { name: string; image_url: string }
}

export function useFamily() {
  const [players, setPlayers] = useState<Player[]>([])
  const [isParent, setIsParent] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: parent } = await supabase
        .from('players')
        .select('family_id, is_parent, is_admin')
        .eq('google_id', user.id)
        .single()

      if (!parent) return

      setIsParent(parent.is_parent)
      setIsAdmin(parent.is_admin ?? false)

      const { data } = await supabase
        .from('players')
        .select('*, characters(name, image_url)')
        .eq('family_id', parent.family_id)
        .order('created_at')

      if (data) setPlayers(data as any)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return { players, isParent, isAdmin, loading, refresh: load }
}
