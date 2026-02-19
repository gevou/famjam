'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  AudioTrack,
  useParticipants,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track, DataPacket_Kind, RoomEvent } from 'livekit-client'
import { useRoomContext } from '@livekit/components-react'
import type { DataMessage, SendDataFn } from '@/lib/hooks/use-game-room'
import '@livekit/components-styles'

type RoomPlayer = {
  player_id: string
  players: {
    id: string
    display_name: string
    characters?: { name: string; image_url: string }
  }
}

function AdaptiveVideoContainer({
  trackRef,
  mirror,
  children,
}: {
  trackRef: any
  mirror: boolean
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [portrait, setPortrait] = useState(false)

  useEffect(() => {
    const publication = trackRef.publication
    const track = publication?.track
    if (!track) return

    function checkDimensions() {
      const el = track?.attachedElements?.[0] as HTMLVideoElement | undefined
      if (el && el.videoWidth && el.videoHeight) {
        setPortrait(el.videoHeight > el.videoWidth)
      }
    }

    // Check periodically until we get dimensions (video may not have loaded yet)
    checkDimensions()
    const interval = setInterval(checkDimensions, 500)
    const timeout = setTimeout(() => clearInterval(interval), 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [trackRef])

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden bg-gray-800 ${portrait ? 'aspect-[3/4]' : 'aspect-video'}`}
    >
      <VideoTrack
        trackRef={trackRef}
        className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
      />
      {children}
    </div>
  )
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

  // Build maps by player identity
  const cameraByIdentity = new Map<string, (typeof tracks)[number]>()
  for (const t of tracks) {
    if (t.source === Track.Source.Camera) {
      cameraByIdentity.set(t.participant.identity, t)
    }
  }
  const participantByIdentity = new Map(participants.map(p => [p.identity, p]))

  // In lite mode: only show active turn player + yourself (keep all audio)
  const visiblePlayers = liteMode && activeTurnPlayerId
    ? roomPlayers.filter(rp => rp.players.id === activeTurnPlayerId || rp.players.id === currentPlayerId)
    : roomPlayers

  return (
    <div>
      <div className={`grid gap-2 ${visiblePlayers.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'}`}>
        {visiblePlayers.map((rp) => {
          const pid = rp.players.id
          const player = rp.players
          const participant = participantByIdentity.get(pid)
          const isConnected = !!participant
          const isActive = pid === activeTurnPlayerId
          const isYou = pid === currentPlayerId
          const cameraTrack = cameraByIdentity.get(pid)
          const isSpeaking = participant?.isSpeaking || false
          const micEnabled = participant?.isMicrophoneEnabled || false

          const nameOverlay = (
            <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2 pointer-events-none">
              <div className={`flex items-center gap-1.5 backdrop-blur-sm px-3 py-1.5 rounded-full ${
                isConnected ? 'bg-green-500/40' : 'bg-black/60'
              }`}>
                {player.characters?.image_url && (
                  <img src={player.characters.image_url} alt="" className="w-5 h-5" />
                )}
                <span className={`text-sm font-medium ${isConnected ? 'text-green-200' : 'text-white/50'}`}>
                  {player.display_name}
                  {isYou && ' (You)'}
                </span>
                {isActive && (
                  <span className="text-yellow-400 text-xs font-bold ml-1">YOUR TURN</span>
                )}
                {isConnected && (
                  micEnabled ? (
                    <span className={`text-xs ml-1 ${isSpeaking ? 'text-green-400' : 'text-white/40'}`}>
                      {isSpeaking ? '🔊' : '🎤'}
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs ml-1">🔇</span>
                  )
                )}
              </div>
            </div>
          )

          const ringClasses = `${isActive ? 'ring-4 ring-yellow-400' : ''} ${isSpeaking ? 'ring-2 ring-green-400' : ''}`

          return cameraTrack ? (
            <div key={pid} className={ringClasses + ' rounded-xl'}>
              <AdaptiveVideoContainer trackRef={cameraTrack} mirror={isYou}>
                {nameOverlay}
              </AdaptiveVideoContainer>
            </div>
          ) : (
            <div
              key={pid}
              className={`relative rounded-xl overflow-hidden bg-gray-800 aspect-video ${ringClasses}`}
            >
              <div className="w-full h-full flex items-center justify-center">
                {player.characters?.image_url ? (
                  <img src={player.characters.image_url} alt="" className={`w-16 h-16 ${isConnected ? 'opacity-60' : 'opacity-20 grayscale'}`} />
                ) : (
                  <div className="text-white/40 text-4xl">?</div>
                )}
              </div>
              {nameOverlay}
            </div>
          )
        })}
      </div>
      {/* Render all remote audio tracks */}
      {tracks
        .filter(t => t.source === Track.Source.Microphone && t.participant.identity !== currentPlayerId)
        .map((track) => (
          <AudioTrack key={track.participant.sid + '-audio'} trackRef={track} />
        ))
      }
    </div>
  )
}

function DataSync({
  onMessage,
  setSendData,
}: {
  onMessage: (msg: DataMessage) => void
  setSendData: (fn: SendDataFn) => void
}) {
  const room = useRoomContext()

  useEffect(() => {
    // Register send function
    const send: SendDataFn = (msg) => {
      const encoded = new TextEncoder().encode(JSON.stringify(msg))
      room.localParticipant.publishData(encoded, { reliable: true })
    }
    setSendData(send)

    // Listen for incoming data
    const handleData = (payload: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as DataMessage
        onMessage(msg)
      } catch {}
    }

    room.on(RoomEvent.DataReceived, handleData)
    return () => {
      room.off(RoomEvent.DataReceived, handleData)
    }
  }, [room, onMessage, setSendData])

  return null
}

function RoomControls({ liteMode, setLiteMode }: { liteMode: boolean; setLiteMode: (v: boolean) => void }) {
  const { localParticipant } = useLocalParticipant()
  const micEnabled = localParticipant.isMicrophoneEnabled

  return (
    <div className="flex gap-2 justify-center">
      <button
        onClick={() => localParticipant.setMicrophoneEnabled(!micEnabled)}
        className={`px-4 py-2 rounded-lg text-sm font-semibold ${
          !micEnabled ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
        }`}
      >
        {!micEnabled ? 'Unmute Mic' : 'Mute Mic'}
      </button>
      {/* TODO: re-enable lite mode after iPad Mini 2 testing */}
    </div>
  )
}

export function VideoChat({
  roomId,
  playerId,
  playerName,
  activeTurnPlayerId,
  roomPlayers = [],
  onDataMessage,
  setSendData,
}: {
  roomId: string
  playerId: string
  playerName: string
  activeTurnPlayerId?: string
  roomPlayers?: RoomPlayer[]
  onDataMessage: (msg: DataMessage) => void
  setSendData: (fn: SendDataFn) => void
}) {
  const [token, setToken] = useState<string>('')
  const [liteMode, setLiteMode] = useState(false)

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
        audio={true}
        className="rounded-xl"
      >
        <DataSync onMessage={onDataMessage} setSendData={setSendData} />
        <VideoGrid
          activeTurnPlayerId={activeTurnPlayerId}
          liteMode={liteMode}
          roomPlayers={roomPlayers}
          currentPlayerId={playerId}
        />
        <RoomControls liteMode={liteMode} setLiteMode={setLiteMode} />
      </LiveKitRoom>
    </div>
  )
}
