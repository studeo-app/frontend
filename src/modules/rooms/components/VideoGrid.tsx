import type { RoomParticipant } from '../types/roomSession'
import { VideoTile } from './VideoTile'

interface VideoGridProps {
  participants: RoomParticipant[]
}

function gridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2'
  if (count <= 6) return 'grid-cols-2 lg:grid-cols-3'
  return 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}

export function VideoGrid({ participants }: VideoGridProps) {
  return (
    <div
      className={`grid flex-1 min-h-0 auto-rows-fr gap-2 overflow-y-auto p-2 pb-2 sm:gap-3 sm:p-4 sm:pb-4 ${gridClass(participants.length)}`}
      role="list"
      aria-label="Participantes en la sala"
    >
      {participants.map((participant) => (
        <div
          key={participant.socketId}
          role="listitem"
          className="w-full h-full min-h-0 flex items-center justify-center"
        >
          <VideoTile participant={participant} />
        </div>
      ))}
    </div>
  )
}
