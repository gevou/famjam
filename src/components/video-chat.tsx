'use client'

import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  AudioTrack,
  useParticipants,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

type RoomPlayer = {
  player_id: string
  players: {
    id: string
    display_name: string
    characters?: { name: string; image_url: string }
  }
}

function VideoGrid({
  activeTurnPlayerId,
  liteMode,
  roomPlayers,
  currentPlayerId,
}: {
  activeTurnPlayerId?: string
  liteMode: boolean
  roomPlayers: RoomPlayer[]
  currentPlayerId: string
}) {
  const participants = useParticipants()
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone])

  // Build a map of participant identity -> camera track
  const cameraByIdentity = new Map<string, (typeof tracks)[number]>()
  for (const t of tracks) {
    if (t.source === Track.Source.Camera) {
      cameraByIdentity.set(t.participant.identity, t)
    }
  }

  // In lite mode, only show active turn player
  const visibleParticipants = liteMode && activeTurnPlayerId
    ? participants.filter(p => p.identity === activeTurnPlayerId)
    : participants

  function getPlayerInfo(identity: string) {
    const rp = roomPlayers.find(p => p.players.id === identity)
    return rp?.players
  }

  return (
    <div>
      <div className={`grid gap-2 ${visibleParticipants.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
        {visibleParticipants.map((participant) => {
          const player = getPlayerInfo(participant.identity)
          const isActive = participant.identity === activeTurnPlayerId
          const isYou = participant.identity === currentPlayerId
          const cameraTrack = cameraByIdentity.get(participant.identity)

          return (
            <div
              key={participant.sid}
              className={`relative rounded-xl overflow-hidden bg-gray-800 aspect-video ${
                isActive ? 'ring-4 ring-yellow-400' : ''
              }`}
            >
              {cameraTrack ? (
                <VideoTrack trackRef={cameraTrack} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {player?.characters?.image_url ? (
                    <img src={player.characters.image_url} alt="" className="w-16 h-16 opacity-60" />
                  ) : (
                    <div className="text-white/40 text-4xl">?</div>
                  )}
                </div>
              )}
              {/* Name overlay — subtitle style at bottom center */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  {player?.characters?.image_url && (
                    <img src={player.characters.image_url} alt="" className="w-5 h-5" />
                  )}
                  <span className="text-white text-sm font-medium">
                    {player?.display_name || participant.name || 'Player'}
                    {isYou && ' (You)'}
                  </span>
                  {isActive && (
                    <span className="text-yellow-400 text-xs font-bold ml-1">YOUR TURN</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Ensure all audio tracks are rendered (especially in lite mode) */}
      {liteMode && tracks
        .filter(t => t.source === Track.Source.Microphone)
        .map((track) => (
          <AudioTrack key={track.participant.sid + '-audio'} trackRef={track} />
        ))
      }
      <p className="text-white/40 text-xs text-center mt-1">
        {participants.length} connected
      </p>
    </div>
  )
}

export function VideoChat({
  roomId,
  playerId,
  playerName,
  activeTurnPlayerId,
  roomPlayers = [],
}: {
  roomId: string
  playerId: string
  playerName: string
  activeTurnPlayerId?: string
  roomPlayers?: RoomPlayer[]
}) {
  const [token, setToken] = useState<string>('')
  const [liteMode, setLiteMode] = useState(false)
  const [audioMuted, setAudioMuted] = useState(false)

  useEffect(() => {
    const memory = (navigator as any).deviceMemory
    if (memory && memory < 2) setLiteMode(true)
  }, [])

  useEffect(() => {
    fetch(`/api/livekit-token?room=${roomId}&name=${encodeURIComponent(playerName)}&id=${playerId}`)
      .then(r => r.json())
      .then(data => setToken(data.token))
  }, [roomId, playerId, playerName])

  if (!token) return <div className="text-white text-center py-4">Connecting video...</div>

  return (
    <div className="space-y-2">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        video={true}
        audio={!audioMuted}
        className="rounded-xl"
      >
        <VideoGrid
          activeTurnPlayerId={activeTurnPlayerId}
          liteMode={liteMode}
          roomPlayers={roomPlayers}
          currentPlayerId={playerId}
        />
      </LiveKitRoom>
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setAudioMuted(!audioMuted)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            audioMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
          }`}
        >
          {audioMuted ? 'Unmute Mic' : 'Mute Mic'}
        </button>
        <button
          onClick={() => setLiteMode(!liteMode)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 text-white"
        >
          {liteMode ? 'Show All Video' : 'Lite Mode'}
        </button>
      </div>
    </div>
  )
}
