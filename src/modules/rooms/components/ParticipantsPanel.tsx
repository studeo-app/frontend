import { Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { UserAvatar } from '@/shared/components/user/UserAvatar'
import type { RoomParticipant } from '../types/roomSession'

interface ParticipantsPanelProps {
  participants: RoomParticipant[]
}

export function ParticipantsPanel({ participants }: ParticipantsPanelProps) {
  return (
    <aside
      aria-label="Lista de participantes"
      className="flex w-full shrink-0 flex-col border-l border-auth-input-border bg-auth-surface sm:w-[280px] lg:w-[300px]"
    >
      <div className="border-b border-auth-input-border px-4 py-3.5">
        <h2 className="text-sm font-semibold text-auth-title">
          Participantes ({participants.length})
        </h2>
      </div>

      <ul className="flex-1 overflow-y-auto p-3 space-y-1">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-auth-input-bg/50"
          >
            <UserAvatar
              src={p.avatarUrl}
              alt={p.displayName}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-auth-title">
                {p.displayName}
                {p.isLocal && (
                  <span className="ml-1 text-xs text-auth-label">(Tú)</span>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {p.isMicOn ? (
                <Mic className="h-3.5 w-3.5 text-auth-link" aria-hidden="true" />
              ) : (
                <MicOff className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
              )}
              {p.isCameraOn ? (
                <Video className="h-3.5 w-3.5 text-auth-label" aria-hidden="true" />
              ) : (
                <VideoOff className="h-3.5 w-3.5 text-auth-label" aria-hidden="true" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
