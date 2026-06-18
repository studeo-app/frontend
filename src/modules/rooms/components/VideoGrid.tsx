import type { RoomParticipant } from '../types/roomSession'
import { VideoTile } from './VideoTile'

interface VideoGridProps {
  participants: RoomParticipant[]
  mirrorLocalVideo?: boolean
  outputVolume?: number
}

function tileWidthClass(count: number): string {
  if (count <= 1) return 'w-full max-w-5xl'
  if (count === 2) return 'w-full sm:w-[calc(50%-0.5rem)] max-w-3xl'
  if (count === 3) return 'w-[calc(50%-0.25rem)] md:w-[calc(33.33%-0.75rem)] max-w-2xl'
  if (count === 4) return 'w-[calc(50%-0.25rem)] sm:w-[calc(50%-0.5rem)] max-w-2xl'
  if (count <= 6) return 'w-[calc(50%-0.25rem)] lg:w-[calc(33.33%-0.75rem)] max-w-xl'
  return 'w-[calc(50%-0.25rem)] sm:w-[calc(33.33%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-lg'
}

function screenGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 2) return 'grid-cols-1 lg:grid-cols-2'
  return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
}

export function VideoGrid({
  participants,
  mirrorLocalVideo = true,
  outputVolume = 80,
}: VideoGridProps) {
  const screenShareParticipants = participants.filter(
    (participant) => participant.isScreenSharing && participant.videoStream,
  )
  const hasScreenShares = screenShareParticipants.length > 0

  // 👑 ORDENAR PARTICIPANTES: El usuario local siempre va primero (arriba a la izquierda)
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isLocal) return -1 // 'a' es local, va primero
    if (b.isLocal) return 1  // 'b' es local, va primero
    return 0                 // los demás mantienen su orden
  })

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2 pb-2 sm:gap-3 sm:p-4 sm:pb-4"
      role="list"
      aria-label="Participantes en la sala"
    >
      {hasScreenShares && (
        <section
          className={`grid min-h-[220px] shrink-0 gap-2 sm:gap-3 ${screenGridClass(screenShareParticipants.length)}`}
          aria-label="Pantallas compartidas"
        >
          {screenShareParticipants.map((participant) => (
            <div
              key={`${participant.socketId}-screen`}
              role="listitem"
              className="flex min-h-[220px] w-full items-center justify-center"
            >
              <VideoTile
                participant={participant}
                mirrorLocalVideo={false}
                outputVolume={outputVolume}
                mode="screen"
              />
            </div>
          ))}
        </section>
      )}

      <div
        className={`flex flex-wrap justify-center items-center content-center gap-2 sm:gap-3 min-h-0 flex-1 overflow-y-auto ${
          hasScreenShares ? 'max-h-[42%]' : ''
        }`}
      >
        {/* Usamos sortedParticipants en lugar de participants */}
        {sortedParticipants.map((participant) => (
          <div
            key={participant.socketId}
            role="listitem"
            className={`flex items-center justify-center ${tileWidthClass(sortedParticipants.length)}`}
          >
            <VideoTile
              participant={participant}
              mirrorLocalVideo={mirrorLocalVideo}
              outputVolume={outputVolume}
              suppressScreenShareVideo={hasScreenShares}
            />
          </div>
        ))}
      </div>
    </div>
  )
}