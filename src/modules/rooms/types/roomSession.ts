import type { RoomReactionEmoji } from '../constants/roomReactions'
import type { RoomReaction } from './roomReaction'

export type RoomConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface RoomParticipant {
  id: string
  socketId: string
  displayName: string
  avatarUrl?: string
  initials?: string
  isLocal: boolean
  isCameraOn: boolean
  isMicOn: boolean
  isScreenSharing?: boolean
  isSpeaking?: boolean
  isScreenSpeaking?: boolean
  videoStream?: MediaStream | null
  screenStream?: MediaStream | null
}

export interface RoomChatMessage {
  id: string
  userId: string
  displayName: string
  text: string
  timestamp: string
}

export type LocalCaptionsStatus =
  | 'idle'
  | 'loading'
  | 'active'
  | 'transcribing'
  | 'unsupported'
  | 'error'

export interface RoomCaption {
  roomId: string
  socketId: string
  uid: string | null
  username: string
  text: string
  isFinal: boolean
  updatedAt: string
}

export interface LocalCaptionsState {
  enabled: boolean
  status: LocalCaptionsStatus
  error: string | null
  model: string | null
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
  captions: RoomCaption[]
  reactions: RoomReaction[]
  localCaptions: LocalCaptionsState
  localMedia: LocalMediaState
  mirrorLocalVideo: boolean
  outputVolume: number
  cameraFacingMode: 'user' | 'environment'
  connectionStatus: RoomConnectionStatus
  loadingHistory: boolean
  hasMoreHistory: boolean
}

export type RoomSidebarPanel = 'participants' | 'chat' | 'settings' | null

export interface LeaveRoomOptions {
  replace?: boolean
  state?: unknown
}

export interface RoomSessionActions {
  toggleMic: () => void
  toggleCamera: () => void
  toggleScreenShare: () => void
  toggleMirrorLocalVideo: () => void
  setOutputVolume: (volume: number) => void
  switchCamera: () => void
  toggleLocalCaptions: () => void
  sendMessage: (text: string) => void
  sendReaction: (emoji: RoomReactionEmoji) => void
  leaveRoom: (options?: LeaveRoomOptions) => void
  loadMoreHistory: () => void
  retry: () => void
  muteParticipant: (uid: string) => void
  kickParticipant: (uid: string) => void
}
