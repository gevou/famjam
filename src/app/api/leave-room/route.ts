import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const roomId = req.nextUrl.searchParams.get('room')
  const playerId = req.nextUrl.searchParams.get('player')

  if (!roomId || !playerId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const supabase = await createClient()

  await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId)

  return NextResponse.json({ ok: true })
}

// sendBeacon sends POST by default, but handle GET too for robustness
export async function GET(req: NextRequest) {
  return POST(req)
}
