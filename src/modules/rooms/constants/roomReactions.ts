export const ROOM_REACTIONS = [
  { emoji: '👍', label: 'Me gusta' },
  { emoji: '👎', label: 'No me gusta' },
  { emoji: '❤️', label: 'Me encanta' },
  { emoji: '😂', label: 'Me divierte' },
  { emoji: '😮', label: 'Me sorprende' },
  { emoji: '🎉', label: 'Celebrar' },
  { emoji: '👏', label: 'Aplaudir' },
  { emoji: '😭', label: 'Lloro desconsolado' },
  { emoji: '😢', label: 'Lágrima de tristeza' },
  { emoji: '😡', label: 'Cara muy enojada' },
  { emoji: '🤔', label: 'Pensando' },
] as const

export type RoomReactionEmoji = (typeof ROOM_REACTIONS)[number]['emoji']
