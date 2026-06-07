import {
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react'
import type { RoomSidebarPanel } from '../types/roomSession'

interface RoomSidebarProps {
  activePanel: RoomSidebarPanel
  onPanelChange: (panel: RoomSidebarPanel) => void
  chatHasUnread?: boolean
}

const navItems = [
  { id: 'participants' as const, icon: Users, label: 'Participantes' },
  { id: 'chat' as const, icon: MessageSquare, label: 'Chat' },
  { id: 'settings' as const, icon: Settings, label: 'Ajustes' },
]

export function RoomSidebar({
  activePanel,
  onPanelChange,
  chatHasUnread = false,
}: RoomSidebarProps) {
  return (
    <aside
      aria-label="Navegación de sala"
      className="flex w-[72px] shrink-0 flex-col items-center border-r border-auth-input-border bg-auth-surface py-5"
    >
      <div className="mb-8">
        <span
          className="font-auth text-2xl font-bold text-auth-btn"
          aria-label="Studeo"
        >
          S.
        </span>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activePanel === id
          return (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={isActive}
              title={label}
              onClick={() => onPanelChange(id)}
              className={`
                relative flex h-11 w-11 items-center justify-center rounded-xl
                transition-colors duration-200 cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
                ${
                  isActive
                    ? 'bg-auth-btn/15 text-auth-btn'
                    : 'text-auth-label hover:bg-auth-input-bg hover:text-auth-title'
                }
              `}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {id === 'chat' && chatHasUnread && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-auth-link"
                  aria-hidden="true"
                />
              )}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
