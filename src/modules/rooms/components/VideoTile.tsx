import { Mic, MicOff, VideoOff } from 'lucide-react'
import { UserAvatar } from '@/shared/components/user/UserAvatar'
import type { RoomParticipant } from '../types/roomSession'

interface VideoTileProps {
  participant: RoomParticipant
}

export function VideoTile({ participant }: VideoTileProps) {
  const {
    displayName,
    avatarUrl,
    initials,
    isLocal,
    isCameraOn,
    isMicOn,
    isSpeaking,
    videoStream,
  } = participant

  const nameLabel = isLocal ? `${displayName} (Tú)` : displayName

  return (
    <div
      className={`
        relative flex aspect-video items-center justify-center overflow-hidden
        rounded-2xl bg-auth-input-bg/60
        ${isSpeaking ? 'ring-2 ring-auth-link ring-offset-2 ring-offset-auth-bg' : ''}
      `}
    >
      {isCameraOn && videoStream ? (
        <video
          ref={(el) => {
            if (el && videoStream) el.srcObject = videoStream
          }}
          autoPlay
          playsInline
          muted={isLocal}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : isCameraOn && isLocal ? (
        <div className="absolute inset-0 bg-gradient-to-br from-auth-input-bg to-auth-surface">
          <img
            src="https://images.unsplash.com/photo-1517694712202-14dd9538a43f?w=800&h=600&fit=crop"
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : avatarUrl ? (
        <UserAvatar src={avatarUrl} alt={displayName} size="xl" />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-auth-btn/30 text-2xl font-bold text-auth-btn">
          {initials ?? displayName.charAt(0).toUpperCase()}
        </div>
      )}

      {!isCameraOn && (
        <div className="absolute right-3 top-3 rounded-lg bg-auth-bg/80 p-1.5">
          <VideoOff className="h-4 w-4 text-auth-label" aria-hidden="true" />
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-auth-bg/75 px-2.5 py-1 backdrop-blur-sm">
        <span className="text-xs font-medium text-auth-title">{nameLabel}</span>
        {isMicOn ? (
          <Mic className="h-3 w-3 text-auth-link" aria-label="Micrófono activo" />
        ) : (
          <MicOff className="h-3 w-3 text-rose-400" aria-label="Micrófono silenciado" />
        )}
      </div>
    </div>
  )
}
