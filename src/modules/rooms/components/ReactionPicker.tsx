import { ChevronLeft, ChevronRight, SmilePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROOM_REACTIONS, type RoomReactionEmoji } from '../constants/roomReactions'

interface ReactionPickerProps {
  disabled?: boolean
  onSelect: (emoji: RoomReactionEmoji) => void
}

export function ReactionPicker({ disabled = false, onSelect }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const reactionsRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const firstReactionRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (disabled) setIsOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!isOpen) return

    firstReactionRef.current?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (emoji: RoomReactionEmoji) => {
    onSelect(emoji)
  }

  const scrollReactions = (direction: -1 | 1) => {
    reactionsRef.current?.scrollBy({
      left: direction * 160,
      behavior: 'smooth',
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label="Enviar una reaccion"
        title="Reaccionar"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls="room-reaction-picker"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn sm:h-12 sm:w-12 ${
          disabled
            ? 'cursor-not-allowed bg-auth-input-bg/40 text-auth-label/30 opacity-50'
            : isOpen
              ? 'cursor-pointer bg-auth-btn text-auth-btn-text'
              : 'cursor-pointer bg-auth-input-bg text-auth-title hover:bg-auth-input-border/50'
        }`}
      >
        <SmilePlus className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          id="room-reaction-picker"
          role="group"
          aria-label="Reacciones rapidas"
          className="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-50 flex w-[min(24rem,calc(100vw-1rem))] -translate-x-1/2 items-center gap-1 rounded-2xl border border-auth-input-border bg-auth-surface/95 p-2 shadow-xl backdrop-blur-md animate-scale-up"
        >
          <button
            type="button"
            aria-label="Ver reacciones anteriores"
            title="Reacciones anteriores"
            onClick={() => scrollReactions(-1)}
            className="flex h-9 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-auth-label transition hover:bg-auth-input-bg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div
            ref={reactionsRef}
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {ROOM_REACTIONS.map((reaction) => (
              <button
                key={reaction.emoji}
                ref={reaction.emoji === ROOM_REACTIONS[0]?.emoji ? firstReactionRef : undefined}
                type="button"
                title={reaction.label}
                aria-label={reaction.label}
                onClick={() => handleSelect(reaction.emoji)}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-2xl transition hover:bg-auth-input-bg hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
              >
                {reaction.emoji}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Ver reacciones siguientes"
            title="Reacciones siguientes"
            onClick={() => scrollReactions(1)}
            className="flex h-9 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-auth-label transition hover:bg-auth-input-bg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
