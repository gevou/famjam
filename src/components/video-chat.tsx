'use client'

import { useEffect, useState, useCallback } from 'react'
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
          const isSpeaking = participant.isSpeaking
          const micEnabled = participant.isMicrophoneEnabled

          return (
            <div
              key={participant.sid}
              className={`relative rounded-xl overflow-hidden bg-gray-800 aspect-video ${
                isActive ? 'ring-4 ring-yellow-400' : ''
              } ${isSpeaking ? 'ring-2 ring-green-400' : ''}`}
            >
              {cameraTrack ? (
                <VideoTrack
                  trackRef={cameraTrack}
                  className={`w-full h-full object-cover ${isYou ? 'scale-x-[-1]' : ''}`}
                />
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
                  {micEnabled ? (
                    <span className={`text-xs ml-1 ${isSpeaking ? 'text-green-400' : 'text-white/40'}`}>
                      {isSpeaking ? '🔊' : '🎤'}
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs ml-1">🔇</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Render all remote audio tracks so participants can hear each other */}
      {tracks
        .filter(t => t.source === Track.Source.Microphone && t.participant.identity !== currentPlayerId)
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

function PresenceChips({ roomPlayers }: { roomPlayers: RoomPlayer[] }) {
  const participants = useParticipants()
  const connectedIds = participants.map(p => p.identity)

  if (!roomPlayers.length) return null

  return (
    <div className="flex gap-2 justify-center">
      {roomPlayers.map((rp) => {
        const isPresent = connectedIds.includes(rp.player_id) || connectedIds.includes(rp.players.id)
        return (
          <div
            key={rp.player_id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
              isPresent ? 'bg-white/20' : 'bg-white/5'
            }`}
          >
            {rp.players.characters?.image_url && (
              <img
                src={rp.players.characters.image_url}
                alt=""
                className={`w-5 h-5 ${isPresent ? '' : 'opacity-30 grayscale'}`}
              />
            )}
            <span className={`text-sm ${isPresent ? 'text-white' : 'text-white/30'}`}>
              {rp.players.display_name}
            </span>
            <span className={`w-2 h-2 rounded-full ${isPresent ? 'bg-green-400' : 'bg-white/20'}`} />
          </div>
        )
      })}
    </div>
  )
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
      <button
        onClick={() => setLiteMode(!liteMode)}
        className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/20 text-white"
      >
        {liteMode ? 'Show All Video' : 'Lite Mode'}
      </button>
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
        <PresenceChips roomPlayers={roomPlayers} />
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
