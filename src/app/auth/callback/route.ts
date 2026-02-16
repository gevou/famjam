import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import webpush from 'web-push'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:noreply@famjam.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

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
          .select('id, display_name, family_id')
          .eq('google_id', user.id)
          .single()

        if (player) {
          // Fire-and-forget: notify other family members via web push
          sendPushToFamily(player.family_id, player.id, player.display_name)
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

async function sendPushToFamily(familyId: string, excludePlayerId: string, playerName: string) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  try {
    const supabase = await createClient()

    // Get all family members except the one who just logged in
    const { data: familyPlayers } = await supabase
      .from('players')
      .select('id')
      .eq('family_id', familyId)
      .neq('id', excludePlayerId)

    if (!familyPlayers?.length) return

    const playerIds = familyPlayers.map(p => p.id)

    // Get push subscriptions for those players
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, keys_json')
      .in('player_id', playerIds)

    if (!subscriptions?.length) return

    const payload = JSON.stringify({
      title: 'FamJam',
      body: `${playerName} just signed in!`,
    })

    await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys_json as { p256dh: string; auth: string },
          },
          payload
        )
      )
    )
  } catch {
    // Push delivery is best-effort — don't break login flow
  }
}
