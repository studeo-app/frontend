import type { RoomSessionState } from '../types/roomSession'

/** Datos de demostración — reemplazar por eventos WebSocket del backend-realtime */
export function createMockRoomSession(
  roomId: string,
  localUser: { id: string; displayName: string; avatarUrl?: string },
): RoomSessionState {
  return {
    roomId,
    roomName: 'Algoritmos Avanzados - Sala 04',
    roomCode: 'DEMO01',
    connectionStatus: 'connected',
    localMedia: {
      isMicOn: false,
      isCameraOn: true,
      isScreenSharing: false,
    },
    participants: [
      {
        id: localUser.id,
        socketId: 'local-user',
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl,
        isLocal: true,
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: true,
      },
      {
        id: 'user-david',
        socketId: 'socket-david',
        displayName: 'David P.',
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
        isLocal: false,
        isCameraOn: false,
        isMicOn: false,
      },
      {
        id: 'user-maria',
        socketId: 'socket-maria',
        displayName: 'Maria Lopez',
        initials: 'ML',
        isLocal: false,
        isCameraOn: false,
        isMicOn: true,
      },
      {
        id: 'user-sofia',
        socketId: 'socket-sofia',
        displayName: 'Sofía R.',
        avatarUrl:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
        isLocal: false,
        isCameraOn: true,
        isMicOn: true,
      },
    ],
    messages: [],
    loadingHistory: false,
    hasMoreHistory: false,
  }
}

