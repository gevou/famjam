import { AccessToken } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const roomName = req.nextUrl.searchParams.get('room')
  const participantName = req.nextUrl.searchParams.get('name')
  const participantId = req.nextUrl.searchParams.get('id')

  if (!roomName || !participantName || !participantId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Check if player is admin
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('id', participantId)
    .single()

  const isAdmin = player?.is_admin ?? false

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantId,
    name: participantName,
    metadata: isAdmin ? JSON.stringify({ isAdmin: true }) : undefined,
  })

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  })

  const token = await at.toJwt()
  return NextResponse.json({ token })
}
