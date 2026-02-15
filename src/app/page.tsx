import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('google_id', user.id)
    .single()

  if (!player) redirect('/onboarding')

  redirect('/home')
}
