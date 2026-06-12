import { useMemo } from 'react'
import { Circle, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { UserAvatar } from '@/shared/components/user/UserAvatar'
import type { RoomMember } from '@/types/room'
import type { RoomParticipant } from '../types/roomSession'

interface ParticipantsPanelProps {
  members: RoomMember[]
  onlineParticipants: RoomParticipant[]
  loadingMembers?: boolean
  isOpen?: boolean
}

export function ParticipantsPanel({
  members,
  onlineParticipants,
  loadingMembers = false,
  isOpen = true,
}: ParticipantsPanelProps) {
  const onlineByUid = useMemo(
    () => new Map(onlineParticipants.map((participant) => [participant.id, participant])),
    [onlineParticipants],
  )

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aOnline = onlineByUid.has(a.uid) ? 1 : 0
      const bOnline = onlineByUid.has(b.uid) ? 1 : 0
      return bOnline - aOnline
    })
  }, [members, onlineByUid])

  return (
    <div
      className={`
        h-full shrink-0 flex transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0'}
      `}
    >
      <aside
        aria-label="Lista de miembros"
        className="flex h-full w-[320px] shrink-0 flex-col border-l border-auth-input-border bg-auth-surface"
      >
        <div className="border-b border-auth-input-border px-4 py-3.5">
          <h2 className="text-sm font-semibold text-auth-title">
            Miembros ({members.length})
          </h2>
          <p className="mt-1 text-xs text-auth-label">
            {onlineParticipants.length} online ahora
          </p>
        </div>

        {loadingMembers ? (
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-auth-label">
            Cargando miembros...
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-auth-label">
            No hay miembros registrados en esta sala.
          </div>
        ) : (
          <ul className="flex-1 space-y-1 overflow-y-auto p-3">
            {sortedMembers.map((member) => {
              const online = onlineByUid.get(member.uid)
              const isOnline = Boolean(online)
              const primaryLabel = member.username ?? member.displayName
              const secondaryLabel = member.username
                ? member.displayName || member.email
                : member.email

              return (
                <li
                  key={member.uid}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-auth-input-bg/50"
                >
                  <UserAvatar
                    src={member.avatarUrl}
                    alt={primaryLabel}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-auth-title">
                      {primaryLabel}
                    </p>
                    <p className="truncate text-xs text-auth-label">
                      {secondaryLabel}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-auth-label">
                      <Circle
                        className={`h-2 w-2 fill-current ${
                          isOnline ? 'text-auth-link' : 'text-auth-input-border'
                        }`}
                        aria-hidden="true"
                      />
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  {online && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {online.isMicOn ? (
                        <Mic className="h-3.5 w-3.5 text-auth-link" aria-hidden="true" />
                      ) : (
                        <MicOff className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                      )}
                      {online.isCameraOn ? (
                        <Video className="h-3.5 w-3.5 text-auth-label" aria-hidden="true" />
                      ) : (
                        <VideoOff className="h-3.5 w-3.5 text-auth-label" aria-hidden="true" />
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}