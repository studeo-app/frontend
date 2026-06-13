import { ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RoomChatMessage } from '../types/roomSession'

interface ChatPanelProps {
  messages: RoomChatMessage[]
  currentUserId?: string | null
  onSendMessage: (text: string) => void
  loadingHistory?: boolean
  hasMoreHistory?: boolean
  onLoadMore?: () => void
  isOpen?: boolean
  onClose?: () => void
  connectionStatus?: 'connected' | 'connecting' | 'disconnected'
}

const MAX_MESSAGE_LENGTH = 150

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
  connectionStatus = 'connected',
  isOpen = true,
  onClose,
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
      messages.length > prevMessageCount.current && !isFirstLoad.current

    if (isFirstLoad.current || addedToBottom) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isFirstLoad.current ? 'instant' : 'smooth',
      })
      isFirstLoad.current = false
    }

    prevMessageCount.current = messages.length
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return
    onSendMessage(trimmed)
    setDraft('')
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const isAtLimit = draft.length >= MAX_MESSAGE_LENGTH
  const charsLeft = MAX_MESSAGE_LENGTH - draft.length

  return (
    <aside
      aria-label="Chat de sala"
      className={`
        pointer-events-auto fixed inset-x-3 bottom-[92px] top-[74px] z-40 flex h-auto shrink-0 flex-col
        rounded-2xl border border-auth-input-border bg-auth-surface shadow-2xl
        transition-all duration-300 ease-in-out overflow-hidden
        md:static md:h-full md:rounded-none md:border-y-0 md:border-r-0 md:shadow-none
        ${isOpen ? 'translate-y-0 opacity-100 md:w-[320px]' : 'pointer-events-none translate-y-4 opacity-0 md:w-0 md:translate-y-0 md:border-l-0'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-auth-input-border px-4 py-3">
        <h2 className="text-sm font-semibold text-auth-title">Chat</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Esconder chat"
          title="Esconder chat"
          className="rounded-lg p-1 text-auth-label transition-colors hover:bg-auth-input-bg hover:text-auth-title cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Banner de conexión */}
      {connectionStatus !== 'connected' && (
        <div className="border-b border-auth-error/20 bg-auth-error/10 px-4 py-2 text-center text-xs text-auth-error">
          {connectionStatus === 'connecting'
            ? 'Reconectando...'
            : 'Conexión perdida. Intentando reconectar...'}
        </div>
      )}

      {/* Lista de mensajes */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4">
        {/* Botón cargar historial */}
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

        {/* Skeleton de carga */}
        {loadingHistory && messages.length === 0 && (
          <div className="space-y-4 px-2 py-4">
            {[1, 2, 3, 4, 5].map((item) => {
              const isOwn = item % 2 === 0
              return (
                <div
                  key={item}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-pulse`}
                >
                  <div className="max-w-[75%]">
                    <div
                      className={`
                        mb-2 h-3 rounded bg-auth-input-bg
                        ${isOwn ? 'ml-auto w-16' : 'w-20'}
                      `}
                    />
                    <div
                      className={`
                        rounded-2xl bg-auth-input-bg
                        ${
                          item === 1
                            ? 'h-10 w-40'
                            : item === 2
                            ? 'h-8 w-28'
                            : item === 3
                            ? 'h-12 w-52'
                            : item === 4
                            ? 'h-8 w-36'
                            : 'h-10 w-44'
                        }
                      `}
                    />
                  </div>
                </div>
              )
            })}
            <div className="mt-4 text-center">
              <p className="text-xs text-auth-label">Cargando historial...</p>
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!loadingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8">
            <p className="font-auth text-sm text-auth-label">No hay mensajes aún.</p>
            <p className="mt-1 text-xs text-auth-label/60">¡Sé el primero en escribir!</p>
          </div>
        )}

        {/* Mensajes */}
        {messages.length > 0 && (
          <ul className="space-y-3">
            {messages.map((msg, index) => {
              const isOwnMessage = currentUserId === msg.userId
              const prevMsg = index > 0 ? messages[index - 1] : null
              const isSameAuthor = prevMsg?.userId === msg.userId
              const timeDiff = prevMsg
                ? new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()
                : Infinity
              const isGrouped = isSameAuthor && timeDiff < 60000

              return (
                <li
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                    isGrouped ? 'mt-0.5' : ''
                  }`}
                >
                  {/* FIX: max-w-[82%] + w-0 min-w-0 para que el contenedor no expanda el aside */}
                  <div className={`max-w-[82%] min-w-0 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                    {!isGrouped && (
                      <div
                        className={`flex items-baseline gap-2 ${
                          isOwnMessage ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <p className="text-xs font-semibold text-auth-btn truncate max-w-[120px]">
                          {isOwnMessage ? 'Tú' : msg.displayName}
                        </p>
                        <time
                          className="text-[10px] text-auth-label/50 shrink-0"
                          dateTime={msg.timestamp}
                          title={new Date(msg.timestamp).toLocaleString('es')}
                        >
                          {formatRelativeTime(msg.timestamp)}
                        </time>
                      </div>
                    )}
                    {/* FIX: block + break-words + overflow-hidden evitan desbordamiento horizontal */}
                    <p
                      className={`mt-0.5 block rounded-2xl px-3 py-2 text-sm leading-relaxed break-words overflow-hidden ${
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-1.5 border-t border-auth-input-border p-2.5 sm:p-3"
      >
        <div className="flex gap-2">
          <input
            disabled={connectionStatus !== 'connected'}
            type="text"
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              connectionStatus === 'connected' ? 'Escribir un mensaje...' : 'Sin conexión'
            }
            className="
              min-w-0 flex-1 rounded-xl border border-auth-input-border bg-auth-input-bg
              px-3 py-2.5 text-sm text-auth-input-text placeholder:text-auth-label/70 sm:py-2
              focus:border-auth-btn focus:outline-none focus:ring-1 focus:ring-auth-btn
            "
          />
          <button
            type="submit"
            disabled={!draft.trim() || connectionStatus !== 'connected'}
            className="
              shrink-0 rounded-xl bg-auth-btn px-3 py-2.5 text-sm font-semibold text-auth-btn-text sm:px-4 sm:py-2
              transition-all hover:brightness-110 active:scale-[0.98]
              disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer
            "
          >
            Enviar
          </button>
        </div>

        {/* Contador de caracteres — solo visible cuando el usuario está escribiendo */}
        {draft.length > 0 && (
          <p
            className={`text-right text-[10px] transition-colors ${
              isAtLimit
                ? 'text-auth-error font-semibold'
                : charsLeft <= 20
                ? 'text-yellow-400'
                : 'text-auth-label/50'
            }`}
          >
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </p>
        )}
      </form>
    </aside>
  )
}
