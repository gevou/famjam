'use client'

import { useState, useEffect } from 'react'

export function useActivePlayer() {
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setPlayerId(sessionStorage.getItem('activePlayerId'))
  }, [])

  return playerId
}
