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
