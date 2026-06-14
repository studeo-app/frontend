import { Mic, MicOff, VideoOff } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { UserAvatar } from '@/shared/components/user/UserAvatar'
import type { RoomParticipant } from '../types/roomSession'

interface VideoTileProps {
  participant: RoomParticipant
  mirrorLocalVideo?: boolean
  outputVolume?: number
}

export function VideoTile({
  participant,
  mirrorLocalVideo = true,
  outputVolume = 80,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
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

  const nameLabel = isLocal ? `${displayName} (Tu)` : displayName
  const shouldRenderVideo = Boolean(videoStream)
  const normalizedVolume = Math.min(1, Math.max(0, outputVolume / 100))

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== videoStream) {
      videoRef.current.srcObject = videoStream ?? null
    }
  }, [videoStream])

  useEffect(() => {
    if (!videoRef.current || isLocal) return
    videoRef.current.volume = normalizedVolume
  }, [isLocal, normalizedVolume])

  return (
    <div
      className={`
      relative flex w-full max-h-full aspect-video items-center justify-center overflow-hidden
      rounded-xl sm:rounded-2xl
      bg-auth-input-bg/90 border border-gray-300 dark:border-transparent shadow-md
      ${isSpeaking ? 'ring-2 ring-auth-link ring-offset-2 ring-offset-auth-bg' : ''}
    `}
    >
      {shouldRenderVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`
            absolute inset-0 h-full w-full object-cover transition-opacity duration-150
            ${isCameraOn ? 'opacity-100' : 'opacity-0'}
            ${isLocal && mirrorLocalVideo ? '-scale-x-100' : ''}
          `}
        >
          <track kind="captions" />
        </video>
      )}

      {!shouldRenderVideo && isCameraOn && isLocal ? (
        <div className="absolute inset-0 bg-gradient-to-br from-auth-input-bg to-auth-surface">
          <img
            src="https://images.unsplash.com/photo-1517694712202-14dd9538a43f?w=800&h=600&fit=crop"
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : !isCameraOn || !shouldRenderVideo ? (
        avatarUrl ? (
          <UserAvatar src={avatarUrl} alt={displayName} size="xl" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-auth-btn/30 text-xl font-bold text-auth-btn sm:h-24 sm:w-24 sm:text-2xl">
            {initials ?? displayName.charAt(0).toUpperCase()}
          </div>
        )
      ) : null}

      {!isCameraOn && (
        <div className="absolute right-3 top-3 rounded-lg bg-auth-bg/80 p-1.5">
          <VideoOff className="h-4 w-4 text-auth-label" aria-hidden="true" />
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-lg bg-auth-bg/75 px-2.5 py-1 backdrop-blur-sm sm:bottom-3 sm:left-3">
        <span className="truncate text-xs font-medium text-auth-title">{nameLabel}</span>
        {isMicOn ? (
          <Mic className="h-3 w-3 text-auth-link" aria-label="Microfono activo" />
        ) : (
          <MicOff className="h-3 w-3 text-red-500" aria-label="Microfono silenciado" />
        )}
      </div>
    </div>
  )
}
