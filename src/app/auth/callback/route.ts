import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Check if user has a family — if not, redirect to onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('google_id', user.id)
          .single()

        if (player) {
          return NextResponse.redirect(`${origin}/home`)
        }
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
