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
import { Track, RoomEvent } from 'livekit-client'
import { useRoomContext } from '@livekit/components-react'
import type { DataMessage, SendDataFn } from '@/lib/hooks/use-game-room'
import '@livekit/components-styles'

type RoomPlayer = {
  player_id: string
  players: {
    id: string
    display_name: string
    character_id?: string | null
    is_parent?: boolean
    characters?: { name: string; image_url: string } | null
  }
}

// --- Circular video bubble ---

export function VideoFeed({
  displayName,
  isConnected,
  isActive,
  isYou,
  avatarUrl,
  videoTrack,
  isSpeaking,
  micEnabled,
  resultEffect,
  onTap,
  isPlayerParent,
}: {
  displayName: string
  isConnected: boolean
  isActive: boolean
  isYou: boolean
  avatarUrl?: string
  videoTrack: any | null
  isSpeaking: boolean
  micEnabled: boolean
  resultEffect?: 'winner' | 'loser'
  onTap?: () => void
  isPlayerParent?: boolean
}) {
  const ringClasses = resultEffect === 'winner'
    ? 'ring-3 ring-yellow-400 animate-pulse-glow'
    : isActive
      ? 'ring-3 ring-yellow-400 animate-pulse-glow scale-110'
      : isSpeaking
        ? 'ring-2 ring-green-400'
        : 'ring-1 ring-white/20'

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full" onClick={onTap}>
        <div
          className={`relative rounded-full overflow-hidden bg-gray-800 w-full pb-[100%] transition-transform duration-300 shadow-lg ${onTap ? 'cursor-pointer active:scale-95' : ''} ${ringClasses}`}
        >
          {videoTrack ? (
            <div className={`absolute inset-0 ${isYou ? 'scale-x-[-1]' : ''}`}>
              <VideoTrack
                trackRef={videoTrack}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className={`w-3/5 h-3/5 object-contain ${isConnected ? 'opacity-60' : 'opacity-30 grayscale'}`} />
              ) : (
                <div className="text-white/30 text-lg font-bold">{displayName[0]}</div>
              )}
            </div>
          )}
          {resultEffect === 'loser' && (
            <div className="absolute inset-0 bg-blue-900/40 pointer-events-none rounded-full" />
          )}
        </div>
        {isPlayerParent && (
          <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-gray-800 z-10 pointer-events-none" />
        )}
        {resultEffect === 'winner' && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-sm pointer-events-none z-10">👑</div>
        )}
      </div>
      <span className="text-white/80 text-[10px] font-semibold truncate max-w-full text-center leading-none drop-shadow-sm">
        {isYou ? 'You' : displayName.split(' ')[0]}{isConnected && !micEnabled ? ' 🔇' : ''}
      </span>
    </div>
  )
}

// --- Video grid inside LiveKit context ---

function VideoGrid({
  activeTurnPlayerId,
  liteMode,
  roomPlayers,
  currentPlayerId,
  playerEffects,
  roomId,
  isParent,
}: {
  activeTurnPlayerId?: string
  liteMode: boolean
  roomPlayers: RoomPlayer[]
  currentPlayerId: string
  playerEffects: Record<string, 'winner' | 'loser'>
  roomId: string
  isParent: boolean
}) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone])
  const [muteToast, setMuteToast] = useState<string | null>(null)

  const handleToggleMic = useCallback((targetPid: string) => {
    if (targetPid === currentPlayerId) {
      // Toggle own mic
      const enabled = localParticipant.isMicrophoneEnabled
      localParticipant.setMicrophoneEnabled(!enabled)
      setMuteToast(enabled ? 'Mic off' : 'Mic on')
      setTimeout(() => setMuteToast(null), 1500)
    } else if (isParent) {
      // Parent can mute/unmute others via server API
      const participant = participants.find(p => p.identity === targetPid)
      if (!participant) {
        setMuteToast('Player not connected')
        setTimeout(() => setMuteToast(null), 2000)
        return
      }
      const isMuted = !participant.isMicrophoneEnabled
      const action = isMuted ? 'unmuteTrack' : 'muteTrack'
      setMuteToast(isMuted ? 'Unmuting...' : 'Muting...')
      fetch('/api/livekit-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: roomId,
          targetIdentity: targetPid,
          action,
          trackSource: 'microphone',
        }),
      }).then(async r => {
        if (r.ok) {
          setMuteToast(isMuted ? 'Unmuted' : 'Muted')
        } else {
          const d = await r.json().catch(() => ({}))
          setMuteToast(`Error: ${d.error || r.status}`)
        }
        setTimeout(() => setMuteToast(null), 2000)
      }).catch(e => {
        setMuteToast(`Error: ${e.message}`)
        setTimeout(() => setMuteToast(null), 2000)
      })
    } else {
      setMuteToast('Not a parent')
      setTimeout(() => setMuteToast(null), 1500)
    }
  }, [currentPlayerId, localParticipant, isParent, participants, roomId])

  let localSpeakersMuted = false
  try {
    const meta = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {}
    localSpeakersMuted = meta.muteSpeakers === true
  } catch {}

  const cameraByIdentity = new Map<string, (typeof tracks)[number]>()
  for (const t of tracks) {
    if (t.source === Track.Source.Camera) {
      cameraByIdentity.set(t.participant.identity, t)
    }
  }
  const participantByIdentity = new Map(participants.map(p => [p.identity, p]))

  const visiblePlayers = liteMode && activeTurnPlayerId
    ? roomPlayers.filter(rp => rp.players.id === activeTurnPlayerId || rp.players.id === currentPlayerId)
    : roomPlayers

  const playerCount = visiblePlayers.length
  // Bigger bubbles when fewer players
  const sizeClass = playerCount <= 2
    ? 'w-[28vw] max-w-32'
    : playerCount === 3
      ? 'w-[24vw] max-w-28'
      : 'w-[20vw] max-w-24'

  return (
    <div className="relative">
      <div className="inline-flex gap-3 items-start px-4">
        {visiblePlayers.map((rp) => {
          const pid = rp.players.id
          const player = rp.players
          const participant = participantByIdentity.get(pid)
          const isConnected = !!participant
          const isActive = pid === activeTurnPlayerId
          const isYou = pid === currentPlayerId
          const cameraTrack = cameraByIdentity.get(pid) || null
          const isSpeaking = participant?.isSpeaking || false
          const micEnabled = participant?.isMicrophoneEnabled || false

          return (
            <div key={pid} className={`${sizeClass} shrink-0`}>
              <VideoFeed
                displayName={player.display_name}
                isConnected={isConnected}
                isActive={isActive}
                isYou={isYou}
                avatarUrl={player.characters?.image_url}
                videoTrack={cameraTrack}
                isSpeaking={isSpeaking}
                micEnabled={micEnabled}
                resultEffect={playerEffects[pid]}
                onTap={(isYou || isParent) ? () => handleToggleMic(pid) : undefined}
                isPlayerParent={player.is_parent}
              />
            </div>
          )
        })}
      </div>
      {/* Mute toast */}
      {muteToast && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap z-30">
          {muteToast}
        </div>
      )}
      {/* Audio tracks */}
      {!localSpeakersMuted && tracks
        .filter(t => t.source === Track.Source.Microphone && t.participant.identity !== currentPlayerId)
        .map((track) => (
          <AudioTrack key={track.participant.sid + '-audio'} trackRef={track} />
        ))
      }
    </div>
  )
}

// --- Data sync (unchanged) ---

function DataSync({
  onMessage,
  setSendData,
}: {
  onMessage: (msg: DataMessage) => void
  setSendData: (fn: SendDataFn) => void
}) {
  const room = useRoomContext()

  useEffect(() => {
    const send: SendDataFn = (msg) => {
      const encoded = new TextEncoder().encode(JSON.stringify(msg))
      room.localParticipant.publishData(encoded, { reliable: true })
    }
    setSendData(send)

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

// --- Main VideoChat wrapper ---

export function VideoChat({
  roomId,
  playerId,
  playerName,
  activeTurnPlayerId,
  roomPlayers = [],
  onDataMessage,
  setSendData,
  playerEffects,
  isParent,
}: {
  roomId: string
  playerId: string
  playerName: string
  activeTurnPlayerId?: string
  roomPlayers?: RoomPlayer[]
  onDataMessage: (msg: DataMessage) => void
  setSendData: (fn: SendDataFn) => void
  playerEffects?: Record<string, 'winner' | 'loser'>
  isParent?: boolean
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

  if (!token) return null

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      video={true}
      audio={true}
    >
      <DataSync onMessage={onDataMessage} setSendData={setSendData} />
      <VideoGrid
        activeTurnPlayerId={activeTurnPlayerId}
        liteMode={liteMode}
        roomPlayers={roomPlayers}
        currentPlayerId={playerId}
        playerEffects={playerEffects || {}}
        roomId={roomId}
        isParent={isParent || false}
      />
    </LiveKitRoom>
  )
}
