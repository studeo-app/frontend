import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { createMockRoomSession } from '../constants/mockRoomSession'
import type {
  RoomChatMessage,
  RoomSessionActions,
  RoomSessionState,
} from '../types/roomSession'

interface UseRoomSessionResult {
  session: RoomSessionState
  actions: RoomSessionActions
}

/**
 * Estado de sesión en sala. Hoy usa datos mock locales;
 * sustituir la inicialización y mutaciones por eventos Socket.io
 * (join-room, participant-update, chat-message, media-state, etc.).
 */
export function useRoomSession(roomId: string): UseRoomSessionResult {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const firebaseUser = useAuthStore((s) => s.user)

  const localUser = useMemo(
    () => ({
      id: firebaseUser?.uid ?? 'local-user',
      displayName: profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : (firebaseUser?.displayName ?? 'Usuario'),
      avatarUrl: profile?.avatarUrl ?? firebaseUser?.photoURL ?? undefined,
    }),
    [profile, firebaseUser],
  )

  const [session, setSession] = useState<RoomSessionState>(() =>
    createMockRoomSession(roomId, localUser),
  )

  const toggleMic = useCallback(() => {
    setSession((prev) => {
      const nextMic = !prev.localMedia.isMicOn
      return {
        ...prev,
        localMedia: { ...prev.localMedia, isMicOn: nextMic },
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isMicOn: nextMic } : p,
        ),
      }
      // TODO: socket.emit('media-state', { roomId, isMicOn: nextMic })
    })
  }, [roomId])

  const toggleCamera = useCallback(() => {
    setSession((prev) => {
      const nextCam = !prev.localMedia.isCameraOn
      return {
        ...prev,
        localMedia: { ...prev.localMedia, isCameraOn: nextCam },
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isCameraOn: nextCam } : p,
        ),
      }
      // TODO: socket.emit('media-state', { roomId, isCameraOn: nextCam })
    })
  }, [roomId])

  const toggleScreenShare = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      localMedia: {
        ...prev.localMedia,
        isScreenSharing: !prev.localMedia.isScreenSharing,
      },
    }))
    // TODO: socket.emit('screen-share', { roomId, active: !session.localMedia.isScreenSharing })
  }, [roomId])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const message: RoomChatMessage = {
        id: `msg-${Date.now()}`,
        userId: localUser.id,
        displayName: localUser.displayName,
        text: trimmed,
        timestamp: new Date().toISOString(),
      }

      setSession((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }))
      // TODO: socket.emit('chat-message', { roomId, text: trimmed })
    },
    [roomId, localUser],
  )

  const leaveRoom = useCallback(() => {
    // TODO: socket.emit('leave-room', { roomId })
    navigate('/dashboard')
  }, [navigate, roomId])

  const actions: RoomSessionActions = {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
    leaveRoom,
  }

  return { session, actions }
}
