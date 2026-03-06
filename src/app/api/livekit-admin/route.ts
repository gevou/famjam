import { RoomServiceClient } from 'livekit-server-sdk'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { roomName, targetIdentity, action, trackSource } = body

  if (!roomName || !targetIdentity || !action) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const validActions = ['muteTrack', 'unmuteTrack', 'muteSpeakers', 'unmuteSpeakers']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Track actions require trackSource
  if (['muteTrack', 'unmuteTrack'].includes(action)) {
    if (!trackSource || !['microphone', 'camera'].includes(trackSource)) {
      return NextResponse.json({ error: 'Invalid trackSource' }, { status: 400 })
    }
  }

  // Auth note: LiveKit API keys are the security boundary here.
  // Client-side UI gates mute controls behind isParent check.

  const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!livekitHost || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Server misconfigured: LiveKit' }, { status: 500 })
  }

  const svc = new RoomServiceClient(livekitHost, apiKey, apiSecret)

  // Speaker mute: update participant metadata to signal client
  if (action === 'muteSpeakers' || action === 'unmuteSpeakers') {
    const participants = await svc.listParticipants(roomName)
    const target = participants.find(p => p.identity === targetIdentity)
    if (!target) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const existingMeta = target.metadata ? JSON.parse(target.metadata) : {}
    const newMeta = { ...existingMeta, muteSpeakers: action === 'muteSpeakers' }
    await svc.updateParticipant(roomName, targetIdentity, { metadata: JSON.stringify(newMeta) })

    return NextResponse.json({ ok: true })
  }

  // Track mute/unmute
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
