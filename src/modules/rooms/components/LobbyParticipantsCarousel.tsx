import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { LobbyWaitingParticipant } from '../types/lobby'

const VISIBLE_PARTICIPANT_SLOTS = 4

type CarouselItem =
  | { kind: 'participant'; participant: LobbyWaitingParticipant }
  | { kind: 'others'; count: number }

function buildCarouselItems(
  participants: LobbyWaitingParticipant[],
  offset: number,
): CarouselItem[] {
  const visible = participants.slice(offset, offset + VISIBLE_PARTICIPANT_SLOTS)
  const items: CarouselItem[] = visible.map((p) => ({
    kind: 'participant',
    participant: p,
  }))
  const othersCount = participants.length - offset - visible.length
  if (othersCount > 0) {
    items.push({ kind: 'others', count: othersCount })
  }
  return items
}

function get3DStyle(relativePosition: number) {
  const abs = Math.abs(relativePosition)
  return {
    transform: `
      translateX(${relativePosition * 110}px)
      translateZ(${-abs * 50}px)
      rotateY(${relativePosition * 16}deg)
      scale(${1 - abs * 0.05})
    `,
    opacity: 1 - abs * 0.22,
    zIndex: 10 - abs,
  }
}

interface LobbyParticipantsCarouselProps {
  participants: LobbyWaitingParticipant[]
}

export function LobbyParticipantsCarousel({
  participants,
}: LobbyParticipantsCarouselProps) {
  const [offset, setOffset] = useState(0)

  const maxOffset = Math.max(0, participants.length - VISIBLE_PARTICIPANT_SLOTS)
  const canGoLeft = offset > 0
  const canGoRight = offset < maxOffset

  const items = useMemo(
    () => buildCarouselItems(participants, offset),
    [participants, offset],
  )

  if (participants.length === 0) {
    return (
      <p className="font-auth text-sm text-auth-label">Nadie en la sala todavía.</p>
    )
  }

  const centerIndex = (items.length - 1) / 2

  return (
    <div className="w-full">
      <p className="mb-8 text-center font-auth text-[11px] font-medium uppercase tracking-widest text-auth-label">
        Participantes ya en la sala
      </p>

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="Ver participantes anteriores"
          disabled={!canGoLeft}
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          className="
            flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
            border border-auth-input-border bg-auth-surface text-auth-label
            transition-all hover:border-auth-btn/40 hover:text-auth-title
            disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-auth-input-border
            disabled:hover:text-auth-label cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          "
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div
          className="relative h-[90px] w-full max-w-xl overflow-visible"
          style={{ perspective: '900px' }}
          role="list"
          aria-label={`${participants.length} participantes en la sala`}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {items.map((item, index) => {
              const relPos = index - centerIndex
              const style = get3DStyle(relPos)

              if (item.kind === 'others') {
                return (
                  <div
                    key="others"
                    role="listitem"
                    className="absolute flex flex-col items-center gap-2 transition-all duration-500 ease-out"
                    style={style}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-auth-input-bg text-base font-bold text-auth-label shadow-md ring-1 ring-auth-input-border sm:h-16 sm:w-16 sm:text-lg">
                      +{item.count}
                    </div>
                    <span className="text-[11px] text-auth-label sm:text-xs">Otros</span>
                  </div>
                )
              }

              const { participant } = item
              const isCenter = relPos === 0

              return (
                <div
                  key={participant.id}
                  role="listitem"
                  className="absolute flex flex-col items-center gap-2 transition-all duration-500 ease-out"
                  style={style}
                >
                  <div
                    className={`
                      flex items-center justify-center rounded-2xl font-semibold text-white shadow-lg
                      transition-all duration-500
                      ${participant.avatarColor}
                      ${isCenter ? 'h-[72px] w-[72px] text-xl sm:h-20 sm:w-20 sm:text-2xl' : 'h-14 w-14 text-base sm:h-16 sm:w-16 sm:text-lg'}
                    `}
                    aria-hidden="true"
                  >
                    {participant.initials}
                  </div>
                  <span
                    className={`
                      max-w-[80px] truncate text-center text-auth-title
                      ${isCenter ? 'text-xs font-medium sm:text-sm' : 'text-[11px] sm:text-xs'}
                    `}
                  >
                    {participant.displayName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Ver más participantes"
          disabled={!canGoRight}
          onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
          className="
            flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
            border border-auth-input-border bg-auth-surface text-auth-label
            transition-all hover:border-auth-btn/40 hover:text-auth-title
            disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-auth-input-border
            disabled:hover:text-auth-label cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          "
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
