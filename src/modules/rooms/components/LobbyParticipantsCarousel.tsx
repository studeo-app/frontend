import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
      translateX(${relativePosition * 90}px)
      translateZ(${-abs * 40}px)
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

  useEffect(() => {
    setOffset((currentOffset) => Math.min(currentOffset, maxOffset))
  }, [maxOffset])

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
      <p className="mb-3 text-center font-auth text-[11px] font-medium uppercase tracking-widest text-auth-label">
        Participantes ya en la sala
      </p>

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="Ver participantes anteriores"
          disabled={!canGoLeft}
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          className="
            flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
            border border-auth-input-border bg-auth-surface text-auth-label
            transition-all hover:border-auth-btn/40 hover:text-auth-title
            disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-auth-input-border
            disabled:hover:text-auth-label cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          "
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div
          className="relative h-[72px] w-full max-w-xl overflow-visible"
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
                    className="absolute flex flex-col items-center gap-1.5 transition-all duration-500 ease-out"
                    style={style}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-auth-input-bg text-sm font-bold text-auth-label shadow-md ring-1 ring-auth-input-border">
                      +{item.count}
                    </div>
                    <span className="text-[10px] text-auth-label">Otros</span>
                  </div>
                )
              }

              const { participant } = item
              const isCenter = relPos === 0

              return (
                <div
                  key={participant.id}
                  role="listitem"
                  className="absolute flex flex-col items-center gap-1.5 transition-all duration-500 ease-out"
                  style={style}
                >
                  <div
                    className={`
                      flex items-center justify-center rounded-xl font-semibold text-white shadow-lg
                      transition-all duration-500
                      ${participant.avatarColor}
                      ${isCenter ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm'}
                    `}
                    aria-hidden="true"
                  >
                    {participant.avatarUrl ? (
                      <img
                        src={participant.avatarUrl}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      participant.initials
                    )}
                  </div>
                  <span
                    className={`
                      max-w-[72px] truncate text-center text-auth-title
                      ${isCenter ? 'text-[11px] font-medium' : 'text-[10px]'}
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
            flex h-8 w-8 shrink-0 items-center justify-center rounded-xl
            border border-auth-input-border bg-auth-surface text-auth-label
            transition-all hover:border-auth-btn/40 hover:text-auth-title
            disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-auth-input-border
            disabled:hover:text-auth-label cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          "
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}