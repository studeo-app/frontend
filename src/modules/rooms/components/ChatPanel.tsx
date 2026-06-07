import { MoreVertical } from 'lucide-react'
import { useState } from 'react'
import type { RoomChatMessage } from '../types/roomSession'

interface ChatPanelProps {
  messages: RoomChatMessage[]
  onSendMessage: (text: string) => void
}

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  const [draft, setDraft] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    onSendMessage(draft)
    setDraft('')
  }

  return (
    <aside
      aria-label="Chat de sala"
      className="flex w-full shrink-0 flex-col border-l border-auth-input-border bg-auth-surface sm:w-[300px] lg:w-[320px]"
    >
      <div className="flex items-center justify-between border-b border-auth-input-border px-4 py-3.5">
        <h2 className="text-sm font-semibold text-auth-title">Chat</h2>
        <button
          type="button"
          aria-label="Opciones del chat"
          className="rounded-lg p-1 text-auth-label transition-colors hover:bg-auth-input-bg hover:text-auth-title cursor-pointer"
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="font-auth text-sm text-auth-label">No hay mensajes.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => (
              <li key={msg.id}>
                <p className="text-xs font-semibold text-auth-btn">{msg.displayName}</p>
                <p className="mt-0.5 text-sm text-auth-title">{msg.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2 border-t border-auth-input-border p-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribir mensaje..."
          className="
            min-w-0 flex-1 rounded-xl border border-auth-input-border bg-auth-input-bg
            px-3 py-2 text-sm text-auth-input-text placeholder:text-auth-label/70
            focus:border-auth-btn focus:outline-none focus:ring-1 focus:ring-auth-btn
          "
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="
            shrink-0 rounded-xl bg-auth-btn px-4 py-2 text-sm font-semibold text-auth-btn-text
            transition-all hover:brightness-110 active:scale-[0.98]
            disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer
          "
        >
          Enviar
        </button>
      </form>
    </aside>
  )
}
