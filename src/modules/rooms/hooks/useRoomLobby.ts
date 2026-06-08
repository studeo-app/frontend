import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { connectSocket, disconnectSocket, getSocket } from '@/config/socket.config'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  MOCK_CAMERA_DEVICES,
  MOCK_MIC_DEVICES,
} from '../constants/mockLobbyParticipants'
import type { LobbyWaitingParticipant } from '../types/lobby'
import type { LocalMediaState } from '../types/roomSession'

interface RealtimeUserPresence {
  socketId: string
  uid: string | null
  username?: string | null
  name?: string | null
  avatarUrl?: string | null
  roomId: string | null
}

interface UseRoomLobbyResult {
  localMedia: LocalMediaState
  selectedMicId: string
  selectedCameraId: string
  micDevices: typeof MOCK_MIC_DEVICES
  cameraDevices: typeof MOCK_CAMERA_DEVICES
  waitingParticipants: LobbyWaitingParticipant[]
  loadingParticipants: boolean
  previewError: string | null
  toggleMic: () => void
  toggleCamera: () => void
  setSelectedMicId: (id: string) => void
  setSelectedCameraId: (id: string) => void
  joinRoom: () => void
}

const AVATAR_COLORS = [
  'bg-auth-btn',
  'bg-auth-link',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function toLobbyParticipant(
  user: RealtimeUserPresence,
  index: number,
): LobbyWaitingParticipant {
  const displayName =
    user.name?.trim() ||
    user.username?.trim() ||
    user.uid?.slice(0, 8) ||
    user.socketId.slice(0, 8)

  return {
    id: user.socketId,
    displayName,
    initials: getInitials(displayName),
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    avatarUrl: user.avatarUrl ?? undefined,
  }
}

export function useRoomLobby(roomId: string): UseRoomLobbyResult {
  const navigate = useNavigate()
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const [roomUsers, setRoomUsers] = useState<RealtimeUserPresence[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [localMedia, setLocalMedia] = useState<LocalMediaState>({
    isMicOn: true,
    isCameraOn: true,
    isScreenSharing: false,
  })

  const [selectedMicId, setSelectedMicId] = useState(MOCK_MIC_DEVICES[0].deviceId)
  const [selectedCameraId, setSelectedCameraId] = useState(MOCK_CAMERA_DEVICES[0].deviceId)

  useEffect(() => {
    if (!roomId) return
    let cancelled = false

    let timeoutId: number | null = null

    async function initPreview() {
      setLoadingParticipants(true)
      setPreviewError(null)
      timeoutId = window.setTimeout(() => {
        if (!cancelled) {
          setPreviewError('La vista previa tardó demasiado en responder.')
          setLoadingParticipants(false)
        }
      }, 8000)

      try {
        const token = await getIdToken()
        if (cancelled) return

        const socket = connectSocket(token)

        const requestPreview = () => {
          socket.emit('roomUsersPrevisualization', { roomId, socketId: socket.id ?? '' })
        }

        socket.on('roomUsers', (users: RealtimeUserPresence[]) => {
          if (cancelled) return
          if (timeoutId) window.clearTimeout(timeoutId)
          setRoomUsers(users)
          setLoadingParticipants(false)
        })

        socket.on('errorMessage', (err: { message?: string }) => {
          if (cancelled) return
          if (timeoutId) window.clearTimeout(timeoutId)
          setPreviewError(err.message ?? 'No pudimos cargar los usuarios conectados.')
          setLoadingParticipants(false)
        })

        if (socket.connected) {
          requestPreview()
        } else {
          socket.on('connect', requestPreview)
        }
      } catch {
        if (!cancelled) {
          if (timeoutId) window.clearTimeout(timeoutId)
          setPreviewError('No pudimos conectar con la vista previa de la sala.')
          setLoadingParticipants(false)
        }
      }
    }

    initPreview()

    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
      const socket = getSocket()
      if (socket) {
        socket.off('roomUsers')
        socket.off('errorMessage')
        socket.off('connect')
      }
      disconnectSocket()
    }
  }, [roomId, getIdToken])

  const waitingParticipants = useMemo(
    () => roomUsers.map((user, index) => toLobbyParticipant(user, index)),
    [roomUsers],
  )

  const toggleMic = useCallback(() => {
    setLocalMedia((prev) => ({ ...prev, isMicOn: !prev.isMicOn }))
  }, [])

  const toggleCamera = useCallback(() => {
    setLocalMedia((prev) => ({ ...prev, isCameraOn: !prev.isCameraOn }))
  }, [])

  const joinRoom = useCallback(() => {
    navigate(`/room/${roomId}`)
  }, [navigate, roomId])

  return {
    localMedia,
    selectedMicId,
    selectedCameraId,
    micDevices: MOCK_MIC_DEVICES,
    cameraDevices: MOCK_CAMERA_DEVICES,
    waitingParticipants,
    loadingParticipants,
    previewError,
    toggleMic,
    toggleCamera,
    setSelectedMicId,
    setSelectedCameraId,
    joinRoom,
  }
}
