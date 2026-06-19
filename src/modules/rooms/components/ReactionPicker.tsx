import { SmilePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROOM_REACTIONS, type RoomReactionEmoji } from '../constants/roomReactions'

interface ReactionPickerProps {
  disabled?: boolean
  onSelect: (emoji: RoomReactionEmoji) => void
}

export function ReactionPicker({ disabled = false, onSelect }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (disabled) setIsOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
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

  return (
    <div ref={containerRef} className="relative">
      {isOpen && (
        <div className="absolute bottom-[calc(100%+0.75rem)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-auth-input-border bg-auth-surface/95 p-2 shadow-xl backdrop-blur-md animate-scale-up">
          {ROOM_REACTIONS.map((reaction) => (
            <button
              key={reaction.emoji}
              type="button"
              title={reaction.label}
              aria-label={reaction.label}
              onClick={() => handleSelect(reaction.emoji)}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-2xl transition hover:bg-auth-input-bg hover:scale-110 active:scale-95"
            >
              {reaction.emoji}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        aria-label="Enviar una reaccion"
        title="Reaccionar"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-all active:scale-95 sm:h-12 sm:w-12 ${
          disabled
            ? 'cursor-not-allowed bg-auth-input-bg/40 text-auth-label/30 opacity-50'
            : isOpen
              ? 'cursor-pointer bg-auth-btn text-auth-btn-text'
              : 'cursor-pointer bg-auth-input-bg text-auth-title hover:bg-auth-input-border/50'
        }`}
      >
        <SmilePlus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  )
}
