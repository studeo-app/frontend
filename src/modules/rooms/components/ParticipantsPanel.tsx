import { useMemo } from 'react'
import { Circle, Mic, MicOff, Video, VideoOff, ChevronRight } from 'lucide-react'
import { UserAvatar } from '@/shared/components/user/UserAvatar'
import type { RoomMember } from '@/types/room'
import type { RoomParticipant } from '../types/roomSession'

interface ParticipantsPanelProps {
  members: RoomMember[]
  onlineParticipants: RoomParticipant[]
  loadingMembers?: boolean
  isOpen?: boolean
  onClose?: () => void 
}

export function ParticipantsPanel({
  members,
  onlineParticipants,
  loadingMembers = false,
  isOpen = true,
  onClose, 
}: ParticipantsPanelProps) {
  const memberUids = useMemo(
    () => new Set(members.map((member) => member.uid)),
    [members],
  )

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

  const onlineParticipantsWithoutMember = useMemo(
    () => onlineParticipants.filter((participant) => !memberUids.has(participant.id)),
    [memberUids, onlineParticipants],
  )

  return (
    <div
      className={`
        pointer-events-auto fixed inset-x-3 bottom-[92px] top-[74px] z-40 flex h-auto shrink-0 overflow-hidden
        rounded-2xl shadow-2xl transition-all duration-300 ease-in-out
        md:static md:h-full md:rounded-none md:shadow-none
        ${isOpen ? 'translate-y-0 opacity-100 md:w-[320px]' : 'pointer-events-none translate-y-4 opacity-0 md:w-0 md:translate-y-0'}
      `}
    >
      <aside
        aria-label="Lista de miembros"
        className="flex h-full w-full shrink-0 flex-col border border-auth-input-border bg-auth-surface md:w-[320px] md:border-y-0 md:border-r-0"
      >
        {/* 👑 HEADER ACTUALIZADO: Título a la izquierda, flechita a la derecha */}
        <div className="flex items-center justify-between border-b border-auth-input-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-auth-title truncate">
              Miembros ({members.length})
            </h2>
            <p className="mt-0.5 text-xs text-auth-label">
              {onlineParticipants.length} online ahora
            </p>
          </div>
          <button
            type="button"
            onClick={onClose} 
            aria-label="Esconder participantes"
            title="Esconder participantes"
            className="rounded-lg p-1 text-auth-label transition-colors hover:bg-auth-input-bg hover:text-auth-title cursor-pointer shrink-0 ml-2"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {loadingMembers ? (
          <div className="flex flex-1 items-center justify-center p-4 text-sm text-auth-label">
            Cargando miembros...
          </div>
        ) : members.length === 0 && onlineParticipantsWithoutMember.length === 0 ? (
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
            {onlineParticipantsWithoutMember.map((participant) => (
              <li
                key={participant.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-auth-input-bg/50"
              >
                <UserAvatar
                  src={participant.avatarUrl}
                  alt={participant.displayName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-auth-title">
                    {participant.displayName}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-auth-label">
                    <Circle
                      className="h-2 w-2 fill-current text-auth-link"
                      aria-hidden="true"
                    />
                    Online
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {participant.isMicOn ? (
                    <Mic className="h-3.5 w-3.5 text-auth-link" aria-hidden="true" />
                  ) : (
                    <MicOff className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                  )}
                  {participant.isCameraOn ? (
                    <Video className="h-3.5 w-3.5 text-auth-label" aria-hidden="true" />
                  ) : (
                    <VideoOff className="h-3.5 w-3.5 text-auth-label" aria-hidden="true" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}