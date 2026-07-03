import { ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
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
const GAP = 12 // Spacing between messages (corresponds to space-y-3 which is 12px)
const BUFFER = 500 // Render buffer in pixels (viewport safety margin)



/**
 * Estima la altura del mensaje en base a la longitud del texto y si está agrupado.
 */
function estimateMessageHeight(msg: RoomChatMessage, isGrouped: boolean): number {
  const base = isGrouped ? 28 : 48 // Agrupado no tiene cabecera
  const lineCount = Math.ceil(msg.text.length / 25) // Estimación de caracteres por línea a 320px de ancho
  return base + lineCount * 20 // 20px por línea de texto
}

interface VirtualMessageItemProps {
  id: string
  index: number
  isOwnMessage: boolean
  isGrouped: boolean
  onMeasure: (id: string, height: number, index: number, isGrouped: boolean) => void
  children: React.ReactNode
}

function VirtualMessageItem({
  id,
  index,
  isOwnMessage,
  isGrouped,
  onMeasure,
  children,
}: VirtualMessageItemProps) {
  const elementRef = useRef<HTMLLIElement>(null)

  useLayoutEffect(() => {
    if (elementRef.current) {
      const height = elementRef.current.getBoundingClientRect().height
      onMeasure(id, height, index, isGrouped)
    }
  }) // Se ejecuta en cada commit para capturar cambios dinámicos

  const gap = index === 0 ? 0 : isGrouped ? 2 : GAP

  return (
    <li
      ref={elementRef}
      style={{ marginTop: gap }}
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      {children}
    </li>
  )
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
  const [srAnnouncement, setSrAnnouncement] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userHasScrolledRef = useRef(false)
  const historyLoadRequestedRef = useRef(false)
  const historyAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null)

  // Alturas dinámicas indexadas por mensaje ID
  const [heights, setHeights] = useState<Record<string, number>>({})
  const heightsRef = useRef<Record<string, number>>(heights)

  // Sincronizar el ref de alturas
  useEffect(() => {
    heightsRef.current = heights
  }, [heights])

  // Limpiar el anuncio para permitir que mensajes consecutivos idénticos sean anunciados
  useEffect(() => {
    if (srAnnouncement) {
      const timer = setTimeout(() => {
        setSrAnnouncement('')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [srAnnouncement])

  // Estado del scroll del viewport
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    clientHeight: 600, // Altura por defecto para el primer render
  })

  // Ancho del contenedor para invalidar alturas medidas si cambia (redimensionado)
  const [containerWidth, setContainerWidth] = useState(0)

  // Flag para detectar si estamos al fondo
  const isAtBottom = useRef(true)

  // Referencias para los mensajes anteriores
  const prevMessagesRef = useRef<RoomChatMessage[]>([])

  // Función para hacer scroll al fondo
  const scrollToBottom = useCallback((behavior: 'instant' | 'smooth') => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      })
    }
  }, [])

  // Actualizar el estado de scroll
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      setScrollState({
        scrollTop: container.scrollTop,
        clientHeight: container.clientHeight,
      })
    }
  }, [])

  // Escuchar el evento scroll para detectar si estamos al final y actualizar viewport virtual
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    // Consideramos que está al final si dista menos de 100px del límite
    isAtBottom.current = scrollHeight - scrollTop - clientHeight < 100

    setScrollState({
      scrollTop,
      clientHeight,
    })

    if (
      userHasScrolledRef.current &&
      scrollTop <= 40 &&
      hasMoreHistory &&
      !loadingHistory &&
      !historyLoadRequestedRef.current &&
      onLoadMore
    ) {
      historyLoadRequestedRef.current = true
      historyAnchorRef.current = { scrollHeight, scrollTop }
      isAtBottom.current = false
      onLoadMore()
    }
  }, [hasMoreHistory, loadingHistory, onLoadMore])

  const markUserScroll = useCallback(() => {
    userHasScrolledRef.current = true
  }, [])

  useEffect(() => {
    if (!loadingHistory) historyLoadRequestedRef.current = false
  }, [loadingHistory])

  // Medir la altura real de un mensaje y ajustar el scroll (scroll anchoring) si está antes del viewport
  const handleMeasure = useCallback((id: string, height: number, index: number, isGrouped: boolean) => {
    const msg = messages[index]
    if (!msg) return

    const oldHeight = heightsRef.current[id]
    if (oldHeight !== height) {
      const est = estimateMessageHeight(msg, isGrouped)
      const baseHeight = oldHeight !== undefined ? oldHeight : est
      const diff = height - baseHeight

      // Guardar en el ref inmediatamente para cálculos concurrentes en el mismo frame
      heightsRef.current[id] = height

      const container = scrollContainerRef.current
      if (container) {
        let msgTop = 0
        for (let i = 0; i < index; i++) {
          const m = messages[i]
          const prevM = i > 0 ? messages[i - 1] : null
          const isSameAuthor = prevM?.userId === m.userId
          const timeDiff = prevM
            ? new Date(m.timestamp).getTime() - new Date(prevM.timestamp).getTime()
            : Infinity
          const isGrp = isSameAuthor && timeDiff < 60000

          const gap = i === 0 ? 0 : isGrp ? 2 : GAP
          msgTop += gap + (heightsRef.current[m.id] || estimateMessageHeight(m, isGrp))
        }

        if (!isAtBottom.current && msgTop < container.scrollTop) {
          container.scrollTop += diff
        }
      }

      setHeights((prev) => ({
        ...prev,
        [id]: height,
      }))
    }
  }, [messages])

  // ResizeObserver para detectar cambios de dimensiones en el chat
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Si el ancho cambia y no es el inicial, invalidamos alturas previas
  const prevWidth = useRef(containerWidth)
  useEffect(() => {
    if (prevWidth.current !== containerWidth && containerWidth > 0) {
      setHeights({})
      prevWidth.current = containerWidth
      updateScrollState()
    }
  }, [containerWidth, updateScrollState])

  // Un único posicionamiento al abrir; el historial no carga hasta que el
  // usuario desplace realmente la conversación.
  useLayoutEffect(() => {
    if (!isOpen) return

    userHasScrolledRef.current = false
    historyLoadRequestedRef.current = false
    historyAnchorRef.current = null
    isAtBottom.current = true

    const frameId = requestAnimationFrame(() => {
      scrollToBottom('instant')
      updateScrollState()
    })

    return () => cancelAnimationFrame(frameId)
  }, [isOpen, scrollToBottom, updateScrollState])

  // Asegurar que si estamos marcados para estar al fondo (isAtBottom.current === true),
  // mantengamos el scroll al fondo cuando se actualicen las alturas medidas de los mensajes.
  useEffect(() => {
    if (isOpen && isAtBottom.current && messages.length > 0) {
      scrollToBottom('instant')
    }
  }, [heights, isOpen, messages.length, scrollToBottom])

  // Cálculos de posiciones acumuladas (virtualización)
  const positions = []
  let currentTop = 0
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prevMsg = i > 0 ? messages[i - 1] : null
    const isSameAuthor = prevMsg?.userId === msg.userId
    const timeDiff = prevMsg
      ? new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()
      : Infinity
    const isGrouped = isSameAuthor && timeDiff < 60000

    const gap = i === 0 ? 0 : isGrouped ? 2 : GAP
    currentTop += gap

    const h = heights[msg.id] || estimateMessageHeight(msg, isGrouped)
    positions.push({
      msg,
      index: i,
      top: currentTop,
      height: h,
      isGrouped,
      gap,
    })
    currentTop += h
  }

  const totalHeight = currentTop

  // Determinar los mensajes visibles en pantalla con el buffer de seguridad
  let startIndex = 0
  let endIndex = messages.length - 1

  const viewMin = scrollState.scrollTop - BUFFER
  const viewMax = scrollState.scrollTop + scrollState.clientHeight + BUFFER

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]
    if (p.top + p.height >= viewMin) {
      startIndex = i
      break
    }
  }

  for (let i = startIndex; i < positions.length; i++) {
    const p = positions[i]
    if (p.top > viewMax) {
      endIndex = i - 1
      break
    }
  }

  startIndex = Math.max(0, startIndex)
  endIndex = Math.min(messages.length - 1, Math.max(startIndex, endIndex))

  const visiblePositions = messages.length > 0 ? positions.slice(startIndex, endIndex + 1) : []

  // Calcular la altura del espaciador superior e inferior
  const topSpacerHeight = visiblePositions.length > 0 ? positions[startIndex].top - positions[startIndex].gap : 0
  const bottomSpacerHeight =
    visiblePositions.length > 0
      ? Math.max(0, totalHeight - (positions[endIndex].top + positions[endIndex].height))
      : 0

  // Efecto principal para scroll anchoring al cargar historial y auto-scroll al fondo con nuevos mensajes
  useLayoutEffect(() => {
    const prev = prevMessagesRef.current
    const curr = messages

    if (curr.length === 0) {
      prevMessagesRef.current = curr
      return
    }

    const isFirst = prev.length === 0

    // Verificar si se han añadido mensajes al inicio (historial cargado).
    let messagesWerePrepended = false
    if (prev.length > 0 && curr.length > prev.length) {
      const oldFirstId = prev[0].id
      const newIndex = curr.findIndex((m) => m.id === oldFirstId)
      messagesWerePrepended = newIndex > 0
    }

    // Conservar el punto exacto usando el cambio real del scrollHeight.
    const container = scrollContainerRef.current
    const anchor = historyAnchorRef.current
    if (messagesWerePrepended && container && anchor) {
      const addedHeight = container.scrollHeight - anchor.scrollHeight
      container.scrollTop = anchor.scrollTop + addedHeight
      historyAnchorRef.current = null
    }
    else if (isFirst) {
      scrollToBottom('instant')
    } else {
      const messageAddedToBottom = prev.length > 0 && curr[curr.length - 1]?.id !== prev[prev.length - 1]?.id
      if (messageAddedToBottom) {
        const lastMsg = curr[curr.length - 1]
        if (lastMsg) {
          const isOwn = lastMsg.userId === currentUserId
          const announcement = isOwn
            ? `Tú dijiste: ${lastMsg.text}`
            : `${lastMsg.displayName || 'Alguien'} dice: ${lastMsg.text}`
          setSrAnnouncement(announcement)
        }
      }
      const lastMessageIsOwn = curr[curr.length - 1]?.userId === currentUserId
      if (messageAddedToBottom && (isAtBottom.current || lastMessageIsOwn)) {
        scrollToBottom('smooth')
      }
    }

    prevMessagesRef.current = curr
  }, [messages, currentUserId, scrollToBottom])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed || trimmed.length > MAX_MESSAGE_LENGTH) return
    onSendMessage(trimmed)
    setDraft('')
    requestAnimationFrame(() => {
      scrollToBottom('smooth')
    })
  }

  const isAtLimit = draft.length >= MAX_MESSAGE_LENGTH
  const charsLeft = MAX_MESSAGE_LENGTH - draft.length

  return (
    <div
      className={`
        pointer-events-auto fixed inset-x-3 bottom-[92px] top-[74px] z-40 flex h-auto shrink-0 overflow-hidden
        rounded-2xl shadow-2xl transition-all duration-300 ease-in-out
        md:static md:h-full md:rounded-none md:shadow-none
        ${isOpen ? 'translate-y-0 opacity-100 md:w-[320px]' : 'pointer-events-none translate-y-4 opacity-0 md:w-0 md:translate-y-0'}
      `}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">{srAnnouncement}</div>
      <aside
        aria-label="Chat de sala"
        className="flex h-full w-full shrink-0 flex-col border border-auth-input-border bg-auth-surface md:w-[320px] md:border-y-0 md:border-r-0"
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
      <div ref={scrollContainerRef} 
                onScroll={handleScroll}
                onWheel={markUserScroll}
                onTouchStart={markUserScroll}
                onPointerDown={markUserScroll}
                className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4">
        {/* Ocupa el lugar del botón anterior dentro del flujo del chat. */}
        {hasMoreHistory && messages.length > 0 && (
          <div className="mb-4 flex min-h-7 items-center justify-center" role="status">
            {loadingHistory ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-auth-btn">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Cargando mensajes anteriores…
              </span>
            ) : null}
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
                        ${item === 1
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

        {/* Mensajes Virtualizados */}
        {messages.length > 0 && (
          <ul className="relative" style={{ height: totalHeight }}>
            {/* Espaciador superior */}
            <div style={{ height: topSpacerHeight }} aria-hidden="true" />

            {/* Renderizar solo elementos visibles en ventana */}
            {visiblePositions.map(({ msg, index, isGrouped }) => {
              const isOwnMessage = currentUserId === msg.userId
              return (
                <VirtualMessageItem
                  key={msg.id}
                  id={msg.id}
                  index={index}
                  isOwnMessage={isOwnMessage}
                  isGrouped={isGrouped}
                  onMeasure={handleMeasure}
                >
                  {/* Contenedor interno del mensaje */}
                  <div className={`max-w-[82%] min-w-[70px] text-left`}>
                    <div
                      className={`mt-0.5 relative rounded-2xl px-3 pb-5 pt-2 text-sm leading-relaxed break-words overflow-hidden ${
                        isOwnMessage
                          ? 'bg-auth-btn text-auth-btn-text rounded-tr-sm'
                          : 'bg-auth-input-bg border border-auth-input-border/30 text-auth-title rounded-tl-sm'
                      }`}
                    >
                      {!isOwnMessage && !isGrouped && (
                        <div className="text-[10px] font-bold text-violet-500 mb-0.5 truncate max-w-[150px] select-none">
                          {msg.displayName}
                        </div>
                      )}
                      <div className="pr-4">{msg.text}</div>
                      <time
                        className="absolute bottom-1 right-2 text-[9px] opacity-60 pointer-events-none select-none shrink-0"
                        dateTime={msg.timestamp}
                        title={new Date(msg.timestamp).toLocaleString('es')}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                  </div>
                </VirtualMessageItem>
              )
            })}

            {/* Espaciador inferior */}
            <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
          </ul>
        )}
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
            className={`text-right text-[10px] transition-colors ${isAtLimit
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
    </div>
  )
}
