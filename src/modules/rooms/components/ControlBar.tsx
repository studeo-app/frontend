import { Mic, MicOff, Monitor, PhoneOff, Video, VideoOff } from 'lucide-react'
import type { LocalMediaState } from '../types/roomSession'

interface ControlBarProps {
  media: LocalMediaState
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onLeave: () => void
}

function MediaButton({
  active,
  danger,
  label,
  onClick,
  children,
}: {
  active?: boolean
  danger?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  const bg = active
    ? 'bg-auth-btn text-auth-btn-text hover:brightness-110'
    : 'bg-auth-input-bg text-auth-title hover:bg-auth-input-border/50'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`
        flex h-12 w-12 items-center justify-center rounded-full
        transition-all active:scale-95 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
        shadow-sm ${bg}
      `}
    >
      {children}
    </button>
  )
}

export function ControlBar({
  media,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
}: ControlBarProps) {
  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-auth-input-border bg-auth-surface/95 px-5 py-3 shadow-lg backdrop-blur-md">
      
      {/* Micrófono */}
      <MediaButton
        label={media.isMicOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        active={media.isMicOn}
        onClick={onToggleMic}
      >
        {media.isMicOn ? (
          <Mic className="h-5 w-5" aria-hidden="true" />
        ) : (
          <MicOff className="h-5 w-5" aria-hidden="true" />
        )}
      </MediaButton>

      <MediaButton
        label={media.isCameraOn ? 'Apagar cámara' : 'Encender cámara'}
        active={media.isCameraOn}
        onClick={onToggleCamera}
      >
        {media.isCameraOn ? (
          <Video className="h-5 w-5" aria-hidden="true" />
        ) : (
          <VideoOff className="h-5 w-5" aria-hidden="true" />
        )}
      </MediaButton>

      {/* Compartir Pantalla */}
      <MediaButton
        label={media.isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
        active={media.isScreenSharing}
        onClick={onToggleScreenShare}
      >
        <Monitor className="h-5 w-5" aria-hidden="true" />
      </MediaButton>


      <button
        type="button"
        onClick={onLeave}
        className="
          ml-2 flex items-center gap-2 rounded-full px-5 py-2.5
          text-sm font-bold transition-all active:scale-[0.98] cursor-pointer
          bg-red-600 text-white hover:bg-red-700 shadow-md
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
        "
      >
        <PhoneOff className="h-4 w-4" aria-hidden="true" />
        Salir
      </button>
    </div>
  )
}