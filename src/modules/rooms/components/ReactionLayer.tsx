import type { CSSProperties } from 'react'
import type { RoomReaction } from '../types/roomReaction'

interface ReactionLayerProps {
  reactions: RoomReaction[]
}

function hashReactionId(id: string): number {
  return Array.from(id).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0
  }, 7)
}

export function ReactionLayer({ reactions }: ReactionLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 top-0 z-20 overflow-hidden">
      {reactions.map((reaction) => {
        const hash = hashReactionId(reaction.id)
        const left = 12 + (hash % 77)
        const drift = (Math.floor(hash / 77) % 61) - 30
        const style = {
          left: `${left}%`,
          '--reaction-drift': `${drift}px`,
        } as CSSProperties

        return (
          <div
            key={reaction.id}
            className="room-reaction-float absolute bottom-2 flex -translate-x-1/2 flex-col items-center gap-1"
            style={style}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-auth-surface/90 text-3xl shadow-xl backdrop-blur-sm">
              {reaction.emoji}
            </div>
            <span className="max-w-28 truncate rounded-full bg-auth-bg/80 px-2 py-0.5 text-[10px] font-semibold text-auth-title shadow-sm backdrop-blur-sm">
              {reaction.username}
            </span>
          </div>
        )
      })}
    </div>
  )
}
