import { Check, Copy, MessageSquare, Settings, Users, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { Room } from '@/types/room'
import { BaseModal } from '@/shared/components/ui/BaseModal'
import { RoomActionsMenu } from './RoomActionsMenu'
import type { RoomSidebarPanel } from '../types/roomSession'

interface RoomHeaderProps {
  roomName: string
  participantCount: number
  roomCode: string
  room?: Room | null
  isOwner?: boolean
  onRoomUpdated?: (room: Room) => void
  onRoomDeleted?: () => void
  activePanel?: RoomSidebarPanel | null
  chatHasUnread?: boolean
  onPanelChange?: (panel: RoomSidebarPanel | null) => void
}

const panelButtons = [
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'participants' as const, icon: Users, label: 'Miembros' },
  { id: 'settings' as const, icon: Settings, label: 'Ajustes' },
]

export function RoomHeader({
  roomName,
  participantCount,
  roomCode,
  room,
  isOwner = false,
  onRoomUpdated,
  onRoomDeleted,
  activePanel = null,
  chatHasUnread = false,
  onPanelChange,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <header className="relative z-[45] bg-auth-bg flex min-h-[62px] shrink-0 items-center justify-between gap-2 border-b border-auth-input-border px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3.5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <h1 className="truncate text-sm font-medium text-auth-title sm:text-base">
          {roomName}
        </h1>
        <span className="
          hidden px-2.5 py-1 text-xs font-semibold rounded-full sm:inline-flex
          bg-auth-input-bg text-auth-title border border-auth-input-border
        ">
          {participantCount} online
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-auth-input-border bg-auth-input-bg/40 p-1">
          {panelButtons.map(({ id, icon: Icon, label }) => {
            const isActive = activePanel === id
            return (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={id === 'chat' && chatHasUnread ? 'Abrir chat, hay mensajes nuevos' : label}
                aria-pressed={isActive}
                onClick={() => onPanelChange?.(isActive ? null : id)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn ${
                  isActive
                    ? 'bg-auth-btn text-auth-btn-text'
                    : 'text-auth-label hover:bg-auth-surface hover:text-auth-title'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {id === 'chat' && chatHasUnread && !isActive && (
                  <span
                    className="absolute -right-1 -top-1 rounded-full bg-auth-link px-1.5 py-0.5 text-[9px] font-bold leading-none text-auth-btn-text shadow-sm"
                  >
                    Nuevo
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {room && (
          <RoomActionsMenu
            room={room}
            isOwner={isOwner}
            variant="header"
            onUpdated={onRoomUpdated}
            onDeleted={onRoomDeleted}
          />
        )}

        {/* BOTÓN REEMPLAZADO: Ahora abre el Modal */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          title="Invitar miembro a la sala"
          aria-label="Abrir opciones de invitación"
          className="
            flex h-9 w-9 items-center justify-center gap-2 rounded-xl border border-auth-input-border
            bg-auth-input-bg/50 font-auth text-xs text-auth-label sm:w-auto sm:px-3 sm:py-1.5
            transition-colors hover:border-auth-btn/40 hover:text-auth-title
            cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          "
        >
          <UserPlus className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          <span className="hidden sm:inline">Invitar miembro</span>
        </button>
      </div>

      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invitar miembro a la sala"
        describedBy="room-invite-description"
      >
        <div className="space-y-4">
          <p id="room-invite-description" className="text-sm leading-relaxed text-auth-label">
            Comparte este código con tu equipo para que puedan unirse a la sesión de Studeo.
          </p>

          <div className="rounded-2xl border border-auth-input-border bg-auth-input-bg/40 p-3">
            <label
              htmlFor="room-invite-code"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-auth-label"
            >
              Código de sala
            </label>
            <div className="flex items-center gap-2">
              <input
                id="room-invite-code"
                type="text"
                readOnly
                value={roomCode}
                aria-label={`Código de invitación ${roomCode}`}
                className="h-11 min-w-0 flex-1 rounded-xl border border-auth-input-border bg-auth-surface px-3 text-center font-mono text-base font-bold tracking-[0.2em] text-auth-title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
                onFocus={(event) => event.currentTarget.select()}
              />

              <button
                type="button"
                onClick={handleCopy}
                aria-label={copied ? 'Código copiado al portapapeles' : 'Copiar código de invitación'}
                className={`
                  inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2
                  ${copied ? 'bg-emerald-500 text-white' : 'bg-auth-btn text-auth-btn-text hover:brightness-110'}
                `}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 animate-scale-up" aria-hidden="true" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="sr-only" aria-live="polite">
              {copied ? 'Código de sala copiado.' : ''}
            </p>
          </div>
        </div>
      </BaseModal>
    </header>
  )
}
