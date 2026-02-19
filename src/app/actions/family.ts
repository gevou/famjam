'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createFamily(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const displayName = formData.get('displayName') as string
  const characterId = formData.get('characterId') as string

  const { data: familyId, error } = await supabase.rpc('create_family_with_parent', {
    p_display_name: displayName,
    p_character_id: characterId,
    p_google_id: user.id,
  })

  if (error) throw new Error(`Failed to create family: ${error.message}`)

  redirect('/home')
}

export async function inviteFamilyMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get parent's family
  const { data: parent } = await supabase
    .from('players')
    .select('id, family_id')
    .eq('google_id', user.id)
    .eq('is_parent', true)
    .single()

  if (!parent) throw new Error('Not a parent')

  const email = (formData.get('email') as string).trim().toLowerCase()
  const isParent = formData.get('isParent') === 'true'

  const { error } = await supabase.from('family_invites').insert({
    family_id: parent.family_id,
    invited_email: email,
    invited_by: parent.id,
    is_parent: isParent,
  })

  if (error) {
    if (error.code === '23505') throw new Error('Already invited')
    throw new Error(`Failed to invite: ${error.message}`)
  }
}

export async function updatePlayer(playerId: string, newName: string, newCharacterId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify caller is a parent in the same family
  const { data: parent } = await supabase
    .from('players')
    .select('family_id')
    .eq('google_id', user.id)
    .eq('is_parent', true)
    .single()

  if (!parent) throw new Error('Not a parent')

  const updates: Record<string, string> = { display_name: newName.trim() }
  if (newCharacterId) updates.character_id = newCharacterId

  const { error } = await supabase
    .from('players')
    .update(updates)
    .eq('id', playerId)
    .eq('family_id', parent.family_id)

  if (error) throw new Error(`Failed to update name: ${error.message}`)
}

export async function addFamilyMember(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get parent's family
  const { data: parent } = await supabase
    .from('players')
    .select('family_id')
    .eq('google_id', user.id)
    .eq('is_parent', true)
    .single()

  if (!parent) throw new Error('Not a parent')

  const displayName = formData.get('displayName') as string
  const characterId = formData.get('characterId') as string

  await supabase.from('players').insert({
    family_id: parent.family_id,
    display_name: displayName,
    character_id: characterId,
    is_parent: false,
  })
}
