import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { connectSocket, disconnectSocket, getSocket } from '@/config/socket.config'
import { getRoomMessages } from '../api/chatApi'
import {
  ROOM_DELETED_REASON,
  createRoomDeletedDashboardState,
} from '../constants/roomDeletionNotice'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import type {
  RoomChatMessage,
  RoomSessionActions,
  RoomSessionState,
} from '../types/roomSession'

interface UseRoomSessionResult {
  session: RoomSessionState
  actions: RoomSessionActions
}

interface RoomDeletedPayload {
  roomId: string
  deletedBy: string
  reason: string
}

/**
 * Hook de sesión de sala con conexión real a Socket.IO (backend-realtime)
 * y carga de historial desde el backend NestJS REST.
 */
export function useRoomSession(roomId: string, roomCode?: string): UseRoomSessionResult {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const firebaseUser = useAuthStore((s) => s.user)
  const getIdToken = useAuthStore((s) => s.getIdToken)

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

  // ── Estado de sesión ──────────────────────────────────────────────
  const [session, setSession] = useState<RoomSessionState>(() => ({
    roomId,
    roomName: '',
    roomCode: roomCode ?? '',
    connectionStatus: 'disconnected',
    localMedia: {
      isMicOn: false,
      isCameraOn: true,
      isScreenSharing: false,
    },
    participants: [
      {
        id: localUser.id,
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl,
        isLocal: true,
        isCameraOn: true,
        isMicOn: false,
      },
    ],
    messages: [],
    loadingHistory: false,
    hasMoreHistory: false,
  }))

  // ── Refs para paginación del historial ────────────────────────────
  const nextCursorRef = useRef<string | null>(null)
  const loadingHistoryRef = useRef(false)

  useEffect(() => {
    if (!roomCode) return
    setSession((prev) => ({ ...prev, roomCode }))
  }, [roomCode])

  // ── Conectar Socket.IO + cargar historial al montar ───────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const token = await getIdToken()
        if (cancelled) return

        // 1) Conectar socket
        const socket = connectSocket(token)

        setSession((prev) => ({ ...prev, connectionStatus: 'connecting' }))

        socket.on(ROOM_SOCKET_EVENTS.CONNECT, () => {
          if (cancelled) return
          setSession((prev) => ({ ...prev, connectionStatus: 'connected' }))
          // Registrar presencia global antes de unirse a la sala
          socket.emit(ROOM_SOCKET_EVENTS.NEW_USER)
          socket.emit(ROOM_SOCKET_EVENTS.JOIN_ROOM, { roomId })
        })

        socket.on(ROOM_SOCKET_EVENTS.DISCONNECT, () => {
          if (cancelled) return
          setSession((prev) => ({ ...prev, connectionStatus: 'disconnected' }))
        })

        // ── Eventos de mensajes ──────────────────────────────────────
        socket.on(ROOM_SOCKET_EVENTS.MESSAGE_NEW, (msg) => {
          if (cancelled) return
          const chatMsg: RoomChatMessage = {
            id: `rt-${msg.uid}-${msg.timestamp}`,
            userId: msg.uid,
            displayName: msg.username,
            text: msg.text,
            timestamp: msg.timestamp,
          }
          setSession((prev) => ({
            ...prev,
            messages: [...prev.messages, chatMsg],
          }))
        })

        socket.on(ROOM_SOCKET_EVENTS.MESSAGE_ERROR, (err) => {
          console.error('[Chat] message:error', err)
        })

        socket.on(ROOM_SOCKET_EVENTS.ROOM_USERS, (users: Array<{
          socketId: string
          uid: string | null
          username?: string | null
          name?: string | null
          avatarUrl?: string | null
          isMuted?: boolean
          isVideoOff?: boolean
        }>) => {
          if (cancelled) return
          setSession((prev) => ({
            ...prev,
            participants: users.map((user) => {
              const displayName =
                user.name?.trim() ||
                user.username?.trim() ||
                user.uid?.slice(0, 8) ||
                user.socketId.slice(0, 8)

              return {
                id: user.uid ?? user.socketId,
                displayName,
                avatarUrl: user.avatarUrl ?? undefined,
                isLocal: user.uid === firebaseUser?.uid,
                isCameraOn: !user.isVideoOff,
                isMicOn: !user.isMuted,
              }
            }),
          }))
        })

        // ── Eventos de sala ──────────────────────────────────────────
        socket.on(ROOM_SOCKET_EVENTS.ERROR_MESSAGE, (err) => {
          console.error('[Room] errorMessage', err)
        })

        socket.on(ROOM_SOCKET_EVENTS.ROOM_DELETED, (payload: RoomDeletedPayload) => {
          if (
            cancelled ||
            payload.roomId !== roomId ||
            payload.reason !== ROOM_DELETED_REASON ||
            payload.deletedBy === firebaseUser?.uid
          ) {
            return
          }

          setSession((prev) => ({
            ...prev,
            connectionStatus: 'disconnected',
            participants: [],
          }))
          disconnectSocket()
          navigate('/dashboard', {
            replace: true,
            state: createRoomDeletedDashboardState(),
          })
        })

        // Si el socket ya estaba conectado (reconexión), unirse directamente
        if (socket.connected) {
          setSession((prev) => ({ ...prev, connectionStatus: 'connected' }))
          socket.emit(ROOM_SOCKET_EVENTS.NEW_USER)
          socket.emit(ROOM_SOCKET_EVENTS.JOIN_ROOM, { roomId })
        }

        // 2) Cargar historial de mensajes desde el backend REST
        setSession((prev) => ({ ...prev, loadingHistory: true }))
        try {
          const history = await getRoomMessages(token, roomId)
          if (!cancelled) {
            const historyMessages: RoomChatMessage[] = history.messages.map((m) => ({
              id: m.id,
              userId: m.uid,
              displayName: m.username,
              text: m.text,
              timestamp: m.timestamp,
            }))
            nextCursorRef.current = history.nextCursor
            setSession((prev) => ({
              ...prev,
              messages: [...historyMessages, ...prev.messages.filter(
                // Evitar duplicados: los mensajes en tiempo real que ya estén en el historial
                (rtMsg) => !historyMessages.some((hMsg) => hMsg.id === rtMsg.id),
              )],
              loadingHistory: false,
              hasMoreHistory: history.hasMore,
            }))
          }
        } catch (err) {
          console.error('[Chat] Error loading history:', err)
          if (!cancelled) {
            setSession((prev) => ({ ...prev, loadingHistory: false }))
          }
        }
      } catch (err) {
        console.error('[Room] Error initializing session:', err)
      }
    }

    init()

    return () => {
      cancelled = true
      const socket = getSocket()
      if (socket) {
        socket.emit(ROOM_SOCKET_EVENTS.LEAVE_ROOM)
        socket.off(ROOM_SOCKET_EVENTS.CONNECT)
        socket.off(ROOM_SOCKET_EVENTS.DISCONNECT)
        socket.off(ROOM_SOCKET_EVENTS.MESSAGE_NEW)
        socket.off(ROOM_SOCKET_EVENTS.MESSAGE_ERROR)
        socket.off(ROOM_SOCKET_EVENTS.ROOM_USERS)
        socket.off(ROOM_SOCKET_EVENTS.ERROR_MESSAGE)
        socket.off(ROOM_SOCKET_EVENTS.ROOM_DELETED)
      }
      disconnectSocket()
    }
  }, [roomId, getIdToken, firebaseUser?.uid, navigate])

  // ── Cargar más historial (paginación) ─────────────────────────────
  const loadMoreHistory = useCallback(async () => {
    if (loadingHistoryRef.current || !nextCursorRef.current) return
    loadingHistoryRef.current = true
    setSession((prev) => ({ ...prev, loadingHistory: true }))

    try {
      const token = await getIdToken()
      const history = await getRoomMessages(token, roomId, nextCursorRef.current)
      const olderMessages: RoomChatMessage[] = history.messages.map((m) => ({
        id: m.id,
        userId: m.uid,
        displayName: m.username,
        text: m.text,
        timestamp: m.timestamp,
      }))
      nextCursorRef.current = history.nextCursor
      setSession((prev) => ({
        ...prev,
        messages: [...olderMessages, ...prev.messages],
        loadingHistory: false,
        hasMoreHistory: history.hasMore,
      }))
    } catch (err) {
      console.error('[Chat] Error loading more history:', err)
      setSession((prev) => ({ ...prev, loadingHistory: false }))
    } finally {
      loadingHistoryRef.current = false
    }
  }, [roomId, getIdToken])

  // ── Acciones ──────────────────────────────────────────────────────
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
    })
  }, [])

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
    })
  }, [])

  const toggleScreenShare = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      localMedia: {
        ...prev.localMedia,
        isScreenSharing: !prev.localMedia.isScreenSharing,
      },
    }))
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      const socket = getSocket()
      if (!socket?.connected) {
        console.error('[Chat] Cannot send message: socket not connected')
        return
      }

      socket.emit(ROOM_SOCKET_EVENTS.MESSAGE_SEND, { text: trimmed })
    },
    [],
  )

  const leaveRoom = useCallback(() => {
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit(ROOM_SOCKET_EVENTS.LEAVE_ROOM)
    }
    disconnectSocket()
    navigate('/dashboard')
  }, [navigate])

  const actions: RoomSessionActions = {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    sendMessage,
    leaveRoom,
    loadMoreHistory,
  }

  return { session, actions }
}
