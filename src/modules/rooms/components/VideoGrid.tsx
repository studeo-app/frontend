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
      className={`grid flex-1 gap-3 p-4 auto-rows-fr ${gridClass(participants.length)}`}
      role="list"
      aria-label="Participantes en la sala"
    >
      {participants.map((participant) => (
        <div key={participant.socketId} role="listitem">
          <VideoTile participant={participant} />
        </div>
      ))}
    </div>
  )
}
