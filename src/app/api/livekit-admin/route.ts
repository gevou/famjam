import { RoomServiceClient } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { roomName, targetIdentity, action, trackSource, callerId } = body

  if (!roomName || !targetIdentity || !action || !trackSource || !callerId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  if (!['muteTrack', 'unmuteTrack'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (!['microphone', 'camera'].includes(trackSource)) {
    return NextResponse.json({ error: 'Invalid trackSource' }, { status: 400 })
  }

  // Verify caller is admin
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey,
  )
  const { data: caller } = await supabase
    .from('players')
    .select('is_admin')
    .eq('id', callerId)
    .single()

  if (!caller?.is_admin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!livekitHost || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const svc = new RoomServiceClient(livekitHost, apiKey, apiSecret)

  // Get participant's tracks to find the right one
  const participants = await svc.listParticipants(roomName)
  const target = participants.find(p => p.identity === targetIdentity)

  if (!target) {
    return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
  }

  const sourceMap: Record<string, string> = {
    microphone: 'MICROPHONE',
    camera: 'CAMERA',
  }
  const sourceName = sourceMap[trackSource]

  const track = target.tracks.find(t => t.source?.toString() === sourceName)
  if (!track?.sid) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 })
  }

  const muted = action === 'muteTrack'
  await svc.mutePublishedTrack(roomName, targetIdentity, track.sid, muted)

  return NextResponse.json({ ok: true })
}
