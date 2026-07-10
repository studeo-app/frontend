import { Loader2, Mic, MicOff, VideoOff, Pin, UserMinus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { UserAvatar } from '@/shared/components/user/UserAvatar'
import type { RoomCaption, RoomParticipant } from '../types/roomSession'

interface VideoTileProps {
  participant: RoomParticipant
  mirrorLocalVideo?: boolean
  outputVolume?: number
  mode?: 'camera' | 'screen'
  isPinned?: boolean
  onTogglePin?: () => void
  isOwner?: boolean
  onMute?: () => void
  onKick?: () => void
  fullSize?: boolean
  prioritizeAvatar?: boolean
  caption?: RoomCaption
}

export function VideoTile({
  participant,
  mirrorLocalVideo = true,
  outputVolume = 80,
  mode = 'camera',
  isPinned = false,
  onTogglePin,
  isOwner = false,
  onMute,
  onKick,
  fullSize = false,
  prioritizeAvatar = false,
  caption,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const {
    displayName,
    avatarUrl,
    initials,
    isLocal,
    isCameraOn,
    isMicOn,
    isScreenSharing,
    isSpeaking,
    isScreenSpeaking,
    videoStream,
  } = participant

  const nameLabel = mode === 'screen'
    ? isLocal ? 'Tu pantalla' : `Pantalla de ${displayName}`
    : isLocal ? `${displayName} (Tu)` : displayName

  // Hay stream de video adjunto al elemento <video>
  const shouldRenderVideo = Boolean(videoStream)

  // El video debe ser visible en pantalla
  const shouldShowVideo = Boolean(
    videoStream &&
    (mode === 'screen' ? isScreenSharing : isCameraOn),
  )

  // FIX: mostrar avatar/placeholder siempre que el video NO sea visible,
  // independientemente de isCameraOn — evita la pantalla negra al cargar
  const shouldShowPlaceholder = !shouldShowVideo

  const normalizedVolume = Math.min(1, Math.max(0, outputVolume / 100))
  const isTileSpeaking = mode === 'screen' ? isScreenSpeaking : isSpeaking

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || !videoStream) return

    videoEl.srcObject = videoStream

    const handleTrackEvent = (e: Event) => {
      console.log(`[VideoTile] Stream track event received: ${e.type}. Re-binding srcObject and playing.`)
      videoEl.srcObject = videoStream
      videoEl.play().catch((err) => {
        console.warn('[VideoTile] Failed to play video after track event:', err)
      })
    }

    videoStream.addEventListener('addtrack', handleTrackEvent)
    videoStream.addEventListener('removetrack', handleTrackEvent)

    const tracks = videoStream.getTracks()
    tracks.forEach((track) => {
      track.addEventListener('unmute', handleTrackEvent)
      track.addEventListener('mute', handleTrackEvent)
    })

    return () => {
      videoStream.removeEventListener('addtrack', handleTrackEvent)
      videoStream.removeEventListener('removetrack', handleTrackEvent)
      tracks.forEach((track) => {
        track.removeEventListener('unmute', handleTrackEvent)
        track.removeEventListener('mute', handleTrackEvent)
      })
    }
  }, [videoStream])

  useEffect(() => {
    if (!videoRef.current) return
    videoRef.current.volume = normalizedVolume
  }, [normalizedVolume])

  return (
    <div
      className={`
      group relative flex ${fullSize ? 'w-full h-full' : 'w-full max-h-full aspect-video'} items-center justify-center overflow-hidden
      rounded-xl sm:rounded-2xl
      bg-auth-input-bg/90 border border-gray-300 dark:border-transparent shadow-md transition-all duration-300
      ${isTileSpeaking ? 'ring-[3px] ring-auth-btn ring-offset-2 ring-offset-auth-bg shadow-auth-btn/30' : ''}
    `}
    >
      {/* Botón de fijar (Pin) */}
      {onTogglePin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePin()
          }}
          aria-pressed={isPinned} // Added aria-pressed to communicate toggle state
          className={`absolute left-3 top-3 z-20 rounded-lg bg-auth-bg/85 p-1.5 text-auth-label hover:text-auth-title transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn ${isPinned ? '!text-auth-btn bg-auth-btn/10 border border-auth-btn/30' : ''
            }`}
          title={isPinned ? 'Desfijar' : 'Fijar'}
          aria-label={isPinned ? 'Desfijar participante' : 'Fijar participante'}
        >
          <Pin className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
        </button>
      )}
      {/* Video — siempre en el DOM si hay stream, la visibilidad la controla opacity */}
      {shouldRenderVideo && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label={nameLabel}
          className={`
            absolute inset-0 h-full w-full object-contain transition-opacity duration-150
            ${shouldShowVideo ? 'opacity-100' : 'opacity-0'}
            ${isLocal && mirrorLocalVideo && mode === 'camera' && !isScreenSharing ? '-scale-x-100' : ''}
          `}
        >
          <track kind="captions" />
        </video>
      )}

      {/* Placeholder: avatar o iniciales — se muestra siempre que el video no sea visible */}
      {shouldShowPlaceholder && (
        avatarUrl ? (
          <UserAvatar
            src={avatarUrl}
            alt={displayName}
            size="xl"
            fetchPriority={prioritizeAvatar ? 'high' : 'auto'}
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-auth-btn/30 text-xl font-bold text-auth-btn sm:h-24 sm:w-24 sm:text-2xl">
            {initials ?? displayName.charAt(0).toUpperCase()}
          </div>
        )
      )}

      {/* Ícono de cámara apagada — se muestra cuando la cámara está apagada */}
      {mode === 'camera' && !isCameraOn && (
        <div className={`absolute right-3 top-3 rounded-lg bg-auth-bg/80 p-1.5 animate-fade-in transition-opacity ${isOwner && !isLocal ? 'group-hover:opacity-0 group-hover:pointer-events-none' : ''
          }`}>
          <VideoOff className="h-4 w-4 text-auth-label" aria-hidden="true" />
        </div>
      )}

      {/* Botones de acción del Anfitrión (Silenciar y Expulsar) */}
      {isOwner && !isLocal && (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"> {/* Added group-focus-within:opacity-100 to ensure visibility on keyboard focus */}
          {isMicOn && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onMute?.()
              }}
              className="rounded-lg bg-auth-bg/90 border border-auth-input-border/30 hover:bg-auth-btn hover:text-auth-btn-text p-1.5 text-auth-label transition cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:outline-none" // Added focus-visible ring styles
              title="Silenciar a este participante"
              aria-label="Silenciar a este participante"
            >
              <MicOff className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onKick?.()
            }}
            className="rounded-lg bg-red-500/90 border border-red-600/30 hover:bg-red-600 p-1.5 text-white transition cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:outline-none" // Added focus-visible ring styles
            title="Expulsar a este participante"
            aria-label="Expulsar a este participante"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Indicador de conectando video — se muestra si la cámara está encendida pero no ha llegado el stream */}
      {mode === 'camera' && isCameraOn && !videoStream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-auth-bg/45 backdrop-blur-[2px] select-none animate-fade-in gap-2 z-10">
          <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
          <span className="text-[10px] font-semibold text-auth-title bg-auth-bg/85 px-2 py-0.5 rounded-full border border-auth-input-border/30">
            Conectando video...
          </span>
        </div>
      )}

      {/* Etiqueta de nombre y micrófono */}
      {caption?.text && (
        <div
          className="pointer-events-none absolute bottom-11 left-2 right-2 z-20 rounded-lg border border-white/15 bg-black/80 px-2.5 py-2 text-center text-[11px] font-semibold leading-snug text-white shadow-lg shadow-black/30 backdrop-blur-sm sm:bottom-14 sm:left-3 sm:right-3 sm:text-sm"
          aria-live="polite"
          aria-label={`Subtitulo de ${displayName}: ${caption.text}`}
        >
          <p className="max-h-14 overflow-hidden break-words">{caption.text}</p>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-lg bg-auth-bg/75 px-2.5 py-1 backdrop-blur-sm sm:bottom-3 sm:left-3">
        <span className="truncate text-xs font-medium text-auth-title">{nameLabel}</span>
        {mode === 'camera' && (
          isMicOn ? (
            <Mic className="h-3 w-3 text-auth-link" aria-label="Microfono activo" role="img" />
          ) : (
            <MicOff className="h-3 w-3 text-red-500" aria-label="Microfono silenciado" role="img" />
          )
        )}
      </div>
    </div>
  )
}
