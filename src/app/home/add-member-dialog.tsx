'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addFamilyMember, inviteFamilyMember } from '@/app/actions/family'

type Character = { id: string; name: string; image_url: string }
type Tab = 'kid' | 'invite'

export function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('kid')
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('characters').select('*').then(({ data }) => {
      if (data) setCharacters(data)
    })
  }, [])

  async function handleAddKid(formData: FormData) {
    await addFamilyMember(formData)
    onClose()
    window.location.reload()
  }

  async function handleInvite(formData: FormData) {
    setError('')
    try {
      await inviteFamilyMember(formData)
      setInviteSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send invite')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Add family member</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setTab('kid'); setInviteSent(false); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'kid' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            Add kid profile
          </button>
          <button
            type="button"
            onClick={() => { setTab('invite'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'invite' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            Invite by email
          </button>
        </div>

        {/* Kid profile tab */}
        {tab === 'kid' && (
          <form action={handleAddKid} className="space-y-4">
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
        )}

        {/* Invite by email tab */}
        {tab === 'invite' && !inviteSent && (
          <form action={handleInvite} className="space-y-4">
            <input
              name="email"
              type="email"
              required
              placeholder="Email address"
              className="w-full px-4 py-3 rounded-xl border text-lg"
            />
            <label className="flex items-center gap-3 px-1">
              <input name="isParent" type="checkbox" value="true" className="w-5 h-5 rounded" />
              <span className="text-sm text-gray-700">This person is a parent</span>
            </label>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border">
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-indigo-500 text-white font-semibold"
              >
                Invite
              </button>
            </div>
          </form>
        )}

        {/* Invite sent confirmation */}
        {tab === 'invite' && inviteSent && (
          <div className="space-y-4 text-center">
            <p className="text-gray-700">They'll join your family on their next login.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-indigo-500 text-white font-semibold"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
