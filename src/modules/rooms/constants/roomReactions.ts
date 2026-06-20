export const ROOM_REACTIONS = [
  { emoji: '👍', label: 'Me gusta' },
  { emoji: '👎', label: 'No me gusta' },
  { emoji: '❤️', label: 'Me encanta' },
  { emoji: '😂', label: 'Me divierte' },
  { emoji: '😮', label: 'Me sorprende' },
  { emoji: '🎉', label: 'Celebrar' },
  { emoji: '👏', label: 'Aplaudir' },
] as const

export type RoomReactionEmoji = (typeof ROOM_REACTIONS)[number]['emoji']
