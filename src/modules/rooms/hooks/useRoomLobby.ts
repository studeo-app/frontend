import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { connectSocket, disconnectSocket, getSocket } from '@/config/socket.config'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  MOCK_CAMERA_DEVICES,
  MOCK_MIC_DEVICES,
} from '../constants/mockLobbyParticipants'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import { getRoomMembers } from '../api/roomsApi'
import {
  readLobbyMediaState,
  writeLobbyMediaState,
} from '../utils/lobbyMediaState'
import type { LobbyWaitingParticipant } from '../types/lobby'
import type { LocalMediaState } from '../types/roomSession'
import type { RoomMember } from '@/types/room'

interface RealtimeUserPresence {
  socketId: string
  uid: string | null
  username?: string | null
  name?: string | null
  avatarUrl?: string | null
  roomId: string | null
  isMuted?: boolean
  isVideoOff?: boolean
  isScreenSharing?: boolean
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

function mergeUsersWithMemberProfiles(
  users: RealtimeUserPresence[],
  members: RoomMember[],
): RealtimeUserPresence[] {
  const memberByUid = new Map(members.map((member) => [member.uid, member]))

  return users.map((user) => {
    if (!user.uid) return user

    const member = memberByUid.get(user.uid)
    if (!member) return user

    return {
      ...user,
      name: member.username || member.displayName || user.name,
      username: member.username ?? user.username,
      avatarUrl: member.avatarUrl ?? user.avatarUrl,
    }
  })
}

function getOnlineRoomUsers(
  users: RealtimeUserPresence[],
  roomId: string,
): RealtimeUserPresence[] {
  return users.filter((user) => user.socketId.trim() && user.roomId === roomId)
}

export function useRoomLobby(roomId: string): UseRoomLobbyResult {
  const navigate = useNavigate()
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const isJoiningRoomRef = useRef(false)
  const [roomUsers, setRoomUsers] = useState<RealtimeUserPresence[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const [localMedia, setLocalMedia] = useState<LocalMediaState>(() => readLobbyMediaState(roomId))
  const localMediaRef = useRef(localMedia)

  const [selectedMicId, setSelectedMicId] = useState(MOCK_MIC_DEVICES[0].deviceId)
  const [selectedCameraId, setSelectedCameraId] = useState(MOCK_CAMERA_DEVICES[0].deviceId)

  const publishLobbyMediaStatus = useCallback((media: LocalMediaState) => {
    const socket = getSocket()
    if (!socket?.connected) return

    socket.emit(ROOM_SOCKET_EVENTS.MEDIA_STATUS, {
      isMuted: !media.isMicOn,
      isVideoOff: !media.isCameraOn,
      isScreenSharing: media.isScreenSharing,
    })
  }, [])

  useEffect(() => {
    localMediaRef.current = localMedia
    writeLobbyMediaState(roomId, localMedia)
  }, [localMedia, roomId])

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

        const roomMembersPromise = getRoomMembers(token, roomId).catch(() => [])

        const socket = connectSocket(token)

        const requestPreview = () => {
          socket.emit(ROOM_SOCKET_EVENTS.NEW_USER)
          publishLobbyMediaStatus(localMediaRef.current)
          socket.emit(ROOM_SOCKET_EVENTS.ROOM_USERS_PREVIEW, { roomId, socketId: socket.id ?? '' })
        }

        socket.on(ROOM_SOCKET_EVENTS.ROOM_USERS, async (users: RealtimeUserPresence[]) => {
          if (cancelled) return
          if (timeoutId) window.clearTimeout(timeoutId)
          const roomMembers = await roomMembersPromise
          if (cancelled) return
          const onlineRoomUsers = getOnlineRoomUsers(users, roomId)
          setRoomUsers(mergeUsersWithMemberProfiles(onlineRoomUsers, roomMembers))
          setLoadingParticipants(false)
        })

        socket.on(ROOM_SOCKET_EVENTS.ERROR_MESSAGE, (err: { message?: string }) => {
          if (cancelled) return
          if (timeoutId) window.clearTimeout(timeoutId)
          setPreviewError(err.message ?? 'No pudimos cargar los usuarios conectados.')
          setLoadingParticipants(false)
        })

        if (socket.connected) {
          requestPreview()
        } else {
          socket.on(ROOM_SOCKET_EVENTS.CONNECT, requestPreview)
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
        socket.off(ROOM_SOCKET_EVENTS.ROOM_USERS)
        socket.off(ROOM_SOCKET_EVENTS.ERROR_MESSAGE)
        socket.off(ROOM_SOCKET_EVENTS.CONNECT)
      }
      if (!isJoiningRoomRef.current) {
        disconnectSocket()
      }
    }
  }, [roomId, getIdToken, publishLobbyMediaStatus])

  useEffect(() => {
    publishLobbyMediaStatus(localMedia)
  }, [localMedia, publishLobbyMediaStatus])

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
    isJoiningRoomRef.current = true
    writeLobbyMediaState(roomId, localMedia)
    publishLobbyMediaStatus(localMedia)
    navigate(`/room/${roomId}`)
  }, [localMedia, navigate, publishLobbyMediaStatus, roomId])

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
