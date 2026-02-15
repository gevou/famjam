'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addFamilyMember } from '@/app/actions/family'

type Character = { id: string; name: string; image_url: string }

export function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('characters').select('*').then(({ data }) => {
      if (data) setCharacters(data)
    })
  }, [])

  async function handleSubmit(formData: FormData) {
    await addFamilyMember(formData)
    onClose()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Add family member</h2>
        <form action={handleSubmit} className="space-y-4">
          <input
            name="displayName"
            type="text"
            required
            placeholder="Name"
            className="w-full px-4 py-3 rounded-xl border text-lg"
          />
          <input type="hidden" name="characterId" value={selectedCharacter} />
          <div className="grid grid-cols-4 gap-2">
            {characters.map((char) => (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedCharacter(char.id)}
                className={`p-2 rounded-lg ${
                  selectedCharacter === char.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : 'hover:bg-gray-100'
                }`}
              >
                <img src={char.image_url} alt={char.name} className="w-10 h-10 mx-auto" />
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedCharacter}
              className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-semibold disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
