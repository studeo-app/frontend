export type RoomConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface RoomParticipant {
  id: string
  displayName: string
  avatarUrl?: string
  initials?: string
  isLocal: boolean
  isCameraOn: boolean
  isMicOn: boolean
  isSpeaking?: boolean
  /** WebRTC: stream remoto o local asignado al tile */
  videoStream?: MediaStream | null
}

export interface RoomChatMessage {
  id: string
  userId: string
  displayName: string
  text: string
  timestamp: string
}

export interface LocalMediaState {
  isMicOn: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
}

export interface RoomSessionState {
  roomId: string
  roomName: string
  roomCode: string
  participants: RoomParticipant[]
  messages: RoomChatMessage[]
  localMedia: LocalMediaState
  connectionStatus: RoomConnectionStatus
}

export type RoomSidebarPanel = 'participants' | 'chat' | 'settings' | null

export interface RoomSessionActions {
  toggleMic: () => void
  toggleCamera: () => void
  toggleScreenShare: () => void
  sendMessage: (text: string) => void
  leaveRoom: () => void
}
