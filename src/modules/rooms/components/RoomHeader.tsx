import { ArrowLeft, Check, Copy, MessageSquare, Settings, Users, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Room } from '@/types/room'
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
  const navigate = useNavigate()
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
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-auth-input-border bg-auth-input-bg/50 text-auth-label hover:border-auth-btn/40 hover:text-auth-title transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
          aria-label="Volver al panel"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
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
                aria-label={label}
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
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-auth-link"
                    aria-hidden="true"
                  />
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

      {/* MODAL DE INVITACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          {/* Capa invisible trasera para cerrar al hacer clic fuera */}
          <div className="absolute inset-0 cursor-default" onClick={() => setIsModalOpen(false)} />
          
          {/* Contenedor del Modal */}
          <div className="relative w-full max-w-sm rounded-2xl border border-auth-input-border bg-auth-input-bg p-5 shadow-2xl animate-scale-up z-10">
            {/* Botón cerrar (X) */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-auth-label hover:text-auth-title transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-semibold text-auth-title mb-1">
              Invitar miembro a la sala
            </h3>
            <p className="text-xs text-auth-label mb-4">
              Comparte este código con tu equipo para que puedan unirse a la sesión de Studeo.
            </p>

            {/* Selector e indicador del código */}
            <div className="flex items-center gap-2 rounded-xl border border-auth-input-border bg-auth-surface p-2">
              <span className="flex-1 text-center font-mono text-base font-bold tracking-wider text-auth-title select-all">
                {roomCode}
              </span>
              
              <button
                type="button"
                onClick={handleCopy}
                className={`
                  flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition cursor-pointer
                  ${copied ? 'bg-emerald-500 text-white' : 'bg-auth-btn text-auth-btn-text hover:brightness-110'}
                `}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 animate-scale-up" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
