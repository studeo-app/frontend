import type { RoomReactionEmoji } from '../constants/roomReactions'

export interface RoomReaction {
  id: string
  roomId: string
  socketId: string
  uid: string | null
  username: string
  emoji: RoomReactionEmoji
  createdAt: string
}
