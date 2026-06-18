import { Mic, MicOff, Monitor, PhoneOff, Video, VideoOff } from 'lucide-react'
import type { RoomReactionEmoji } from '../constants/roomReactions'
import type { LocalMediaState } from '../types/roomSession'
import { ReactionPicker } from './ReactionPicker'

interface ControlBarProps {
  media: LocalMediaState
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onSendReaction: (emoji: RoomReactionEmoji) => void
  onLeave: () => void
  disabled?: boolean
}

function MediaButton({
  active,
  label,
  onClick,
  children,
  isDangerWhenOff = false,
  disabled = false,
}: {
  active?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
  isDangerWhenOff?: boolean
  disabled?: boolean
}) {
  const bg = disabled
    ? 'bg-auth-input-bg/40 text-auth-label/30 cursor-not-allowed opacity-50 pointer-events-none'
    : isDangerWhenOff
    ? (active
        ? 'bg-auth-input-bg text-auth-title hover:bg-auth-input-border/50'
        : 'bg-rose-400/20 text-rose-300 hover:bg-rose-400/30'
      )
    : (active
        ? 'bg-auth-btn text-auth-btn-text hover:brightness-110'
        : 'bg-auth-input-bg text-auth-title hover:bg-auth-input-border/50'
      )

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`
        flex h-11 w-11 items-center justify-center rounded-full sm:h-12 sm:w-12
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
  onSendReaction,
  onLeave,
  disabled = false,
}: ControlBarProps) {
  return (
    <div className="flex shrink-0 w-full justify-center pb-4 pt-2 px-3 sm:pb-6 sm:px-4">
      <div className="flex items-center gap-2 rounded-full border border-auth-input-border bg-auth-surface/95 px-3 py-2.5 shadow-lg backdrop-blur-md sm:gap-3 sm:px-5 sm:py-3">
        {/* Micrófono */}
        <MediaButton
          label={media.isMicOn ? 'Silenciar micrófono' : 'Activar micrófono'}
          active={media.isMicOn}
          onClick={onToggleMic}
          isDangerWhenOff
          disabled={disabled}
        >
          {media.isMicOn ? (
            <Mic className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MicOff className="h-5 w-5" aria-hidden="true" />
          )}
        </MediaButton>

        {/* Cámara */}
        <MediaButton
          label={media.isCameraOn ? 'Apagar cámara' : 'Encender cámara'}
          active={media.isCameraOn}
          onClick={onToggleCamera}
          isDangerWhenOff
          disabled={disabled}
        >
          {media.isCameraOn ? (
            <Video className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VideoOff className="h-5 w-5" aria-hidden="true" />
          )}
        </MediaButton>

        <ReactionPicker disabled={disabled} onSelect={onSendReaction} />

        {/* Compartir Pantalla */}
        <MediaButton
          label={media.isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
          active={media.isScreenSharing}
          onClick={onToggleScreenShare}
          disabled={disabled}
        >
          <Monitor className="h-5 w-5" aria-hidden="true" />
        </MediaButton>

        {/* Salir */}
        <button
          type="button"
          onClick={onLeave}
          className="
            ml-1 flex h-11 items-center gap-2 rounded-full px-3 sm:px-5
            text-sm font-bold transition-all active:scale-[0.98] cursor-pointer
            bg-red-600 text-white hover:bg-red-700 shadow-md
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500
          "
        >
          <PhoneOff className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </div>
  )
}
