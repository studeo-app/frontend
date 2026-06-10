import { Check, Copy, MessageSquare, Settings, Users } from 'lucide-react'
import { useState } from 'react'
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
  activePanel?: RoomSidebarPanel
  chatHasUnread?: boolean
  onPanelChange?: (panel: RoomSidebarPanel) => void
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
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-auth-input-border px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="truncate text-sm font-medium text-auth-title sm:text-base">
          {roomName}
        </h1>
        <span className="
          px-2.5 py-1 text-xs font-semibold rounded-full
          bg-auth-input-bg text-auth-title border border-auth-input-border
        ">
          {participantCount} online
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
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

        <button
          type="button"
          onClick={handleCopy}
          title="Copiar código de sala"
          className="
            flex items-center gap-2 rounded-xl border border-auth-input-border
            bg-auth-input-bg/50 px-3 py-1.5 font-auth text-xs text-auth-label
            transition-colors hover:border-auth-btn/40 hover:text-auth-title
            cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          "
        >
          <span>Código: {roomCode}</span>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-auth-link" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  )
}
