import { Loader2, MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RoomChatMessage } from '../types/roomSession'

interface ChatPanelProps {
  messages: RoomChatMessage[]
  currentUserId?: string | null
  onSendMessage: (text: string) => void
  loadingHistory?: boolean
  hasMoreHistory?: boolean
  onLoadMore?: () => void
}

/**
 * Formatea un timestamp ISO a una hora relativa legible.
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'ahora'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffHour < 24) return `hace ${diffHour}h`
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function ChatPanel({
  messages,
  currentUserId,
  onSendMessage,
  loadingHistory = false,
  hasMoreHistory = false,
  onLoadMore,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)
  const prevMessageCount = useRef(messages.length)

  // Auto-scroll al fondo cuando llegan mensajes nuevos (no al cargar historial anterior)
  useEffect(() => {
    if (messages.length === 0) return

    const addedToBottom =
      messages.length > prevMessageCount.current &&
      !isFirstLoad.current

    // En la primera carga o cuando se añaden mensajes al final, scroll al fondo
    if (isFirstLoad.current || addedToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: isFirstLoad.current ? 'instant' : 'smooth' })
      isFirstLoad.current = false
    }

    prevMessageCount.current = messages.length
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    onSendMessage(draft)
    setDraft('')
    // Forzar scroll al enviar
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {/* Botón para cargar mensajes anteriores */}
        {hasMoreHistory && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingHistory}
              className="
                flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
                text-auth-btn transition-all hover:bg-auth-btn/10
                disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer
              "
            >
              {loadingHistory ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  Cargando…
                </>
              ) : (
                'Cargar mensajes anteriores'
              )}
            </button>
          </div>
        )}

        {/* Spinner de carga inicial */}
        {loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-auth-btn" aria-hidden="true" />
            <p className="text-xs text-auth-label">Cargando mensajes…</p>
          </div>
        )}

        {/* Estado vacío */}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="font-auth text-sm text-auth-label">
              No hay mensajes aún.
            </p>
            <p className="mt-1 text-xs text-auth-label/60">
              ¡Sé el primero en escribir!
            </p>
          </div>
        )}

        {/* Lista de mensajes */}
        {messages.length > 0 && (
          <ul className="space-y-3">
            {messages.map((msg, index) => {
              const isOwnMessage = currentUserId === msg.userId
              // Agrupar mensajes consecutivos del mismo autor
              const prevMsg = index > 0 ? messages[index - 1] : null
              const isSameAuthor = prevMsg?.userId === msg.userId
              const timeDiff = prevMsg
                ? new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()
                : Infinity
              const isGrouped = isSameAuthor && timeDiff < 60000 // < 1 minuto

              return (
                <li
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : ''}`}
                >
                  <div className={`max-w-[82%] ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {!isGrouped && (
                      <div className={`flex items-baseline gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <p className="text-xs font-semibold text-auth-btn">
                          {isOwnMessage ? 'Tú' : msg.displayName}
                        </p>
                        <time
                          className="text-[10px] text-auth-label/50"
                          dateTime={msg.timestamp}
                          title={new Date(msg.timestamp).toLocaleString('es')}
                        >
                          {formatRelativeTime(msg.timestamp)}
                        </time>
                      </div>
                    )}
                    <p
                      className={`mt-0.5 inline-block rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        isOwnMessage
                          ? 'bg-auth-btn text-auth-btn-text'
                          : 'bg-transparent px-0 text-auth-title'
                      }`}
                    >
                      {msg.text}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Ancla para auto-scroll */}
        <div ref={messagesEndRef} />
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
