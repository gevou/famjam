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
        // Email allowlist: if ALLOWED_EMAILS is set, reject unlisted users
        const allowedEmails = process.env.ALLOWED_EMAILS
        if (allowedEmails && user.email) {
          const allowed = allowedEmails.split(',').map(e => e.trim().toLowerCase())
          if (!allowed.includes(user.email.toLowerCase())) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/login?error=unauthorized`)
          }
        }

        const { data: player } = await supabase
          .from('players')
          .select('id')
          .eq('google_id', user.id)
          .single()

        if (player) {
          return NextResponse.redirect(`${origin}/home`)
        }

        // Check for pending family invites before sending to onboarding
        const email = user.email
        if (email) {
          const { data: familyId } = await supabase.rpc('accept_pending_invites', {
            p_google_id: user.id,
            p_email: email,
          })
          if (familyId) {
            return NextResponse.redirect(`${origin}/home`)
          }
        }

        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
