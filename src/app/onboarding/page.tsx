'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createFamily } from '@/app/actions/family'

type Character = { id: string; name: string; image_url: string }

export default function OnboardingPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('characters').select('*').then(({ data }) => {
      if (data) setCharacters(data)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-500 to-purple-600 p-8">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-white text-center">Welcome! Set up your family</h1>
        <form action={createFamily} className="space-y-6">
          <div>
            <label className="block text-white text-lg mb-2">Your name</label>
            <input
              name="displayName"
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl text-lg"
              placeholder="e.g., Dad, Mom, Papa..."
            />
          </div>
          <div>
            <label className="block text-white text-lg mb-2">Pick your character</label>
            <input type="hidden" name="characterId" value={selectedCharacter} />
            <div className="grid grid-cols-4 gap-3">
              {characters.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedCharacter(char.id)}
                  className={`p-3 rounded-xl bg-white/20 hover:bg-white/30 transition ${
                    selectedCharacter === char.id ? 'ring-4 ring-yellow-400 bg-white/40' : ''
                  }`}
                >
                  <img src={char.image_url} alt={char.name} className="w-12 h-12 mx-auto" />
                  <p className="text-white text-xs mt-1 text-center">{char.name}</p>
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={!selectedCharacter}
            className="w-full bg-yellow-400 text-gray-900 py-4 rounded-xl text-lg font-bold disabled:opacity-50"
          >
            Create Family
          </button>
        </form>
      </div>
    </div>
  )
}
