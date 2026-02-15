'use client'

import { useEffect, useState } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  AudioTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

function VideoGrid({ activeTurnPlayerId, liteMode }: { activeTurnPlayerId?: string; liteMode: boolean }) {
  const tracks = useTracks([Track.Source.Camera])
  const audioTracks = useTracks([Track.Source.Microphone])

  const visibleTracks = liteMode && activeTurnPlayerId
    ? tracks.filter(t => t.participant.identity === activeTurnPlayerId)
    : tracks

  return (
    <div className={`grid gap-2 ${visibleTracks.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
      {visibleTracks.map((track) => (
        <div
          key={track.participant.sid}
          className={`relative rounded-xl overflow-hidden bg-gray-800 aspect-video ${
            track.participant.identity === activeTurnPlayerId ? 'ring-4 ring-yellow-400' : ''
          }`}
        >
          <VideoTrack trackRef={track} className="w-full h-full object-cover" />
          <p className="absolute bottom-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
            {track.participant.name}
          </p>
        </div>
      ))}
      {liteMode && audioTracks.map((track) => (
        <AudioTrack key={track.participant.sid} trackRef={track} />
      ))}
    </div>
  )
}

export function VideoChat({
  roomId,
  playerId,
  playerName,
  activeTurnPlayerId,
}: {
  roomId: string
  playerId: string
  playerName: string
  activeTurnPlayerId?: string
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

  if (!token) return <div className="text-white">Connecting video...</div>

  return (
    <div className="space-y-2">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        video={true}
        audio={!audioMuted}
        className="rounded-xl"
      >
        <VideoGrid activeTurnPlayerId={activeTurnPlayerId} liteMode={liteMode} />
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
