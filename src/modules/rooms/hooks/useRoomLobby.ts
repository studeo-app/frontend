import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { connectSocket, disconnectSocket, getSocket } from '@/config/socket.config'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  MOCK_CAMERA_DEVICES,
  MOCK_MIC_DEVICES,
} from '../constants/mockLobbyParticipants'
import { getRoomLobbyMediaPrefsKey } from '../constants/roomMediaPrefs'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import { getRoomMembers } from '../api/roomsApi'
import {
  readLobbyMediaState,
  writeLobbyMediaState,
} from '../utils/lobbyMediaState'
import { createRoomAudioConstraints } from '../utils/roomMediaConstraints'
import type { LobbyWaitingParticipant } from '../types/lobby'
import type { LocalMediaState } from '../types/roomSession'
import type { RoomMember } from '@/types/room'

/**
 * Builds the same ideal 16:9 widescreen video constraints used by useRoomSession,
 * so the lobby preview is pixel-identical to what appears in the room.
 */
function createLobbyVideoConstraints(cameraId?: string): MediaTrackConstraints {
  return {
    ...(cameraId ? { deviceId: { exact: cameraId } } : {}),
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: { ideal: 1.7777777778 }, // 16:9
  }
}

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
  localStream: MediaStream | null
  selectedMicId: string
  selectedCameraId: string
  micDevices: typeof MOCK_MIC_DEVICES
  cameraDevices: typeof MOCK_CAMERA_DEVICES
  waitingParticipants: LobbyWaitingParticipant[]
  loadingParticipants: boolean
  previewError: string | null
  mediaError: string | null
  micMonitoring: boolean
  toggleMic: () => void
  toggleCamera: () => void
  toggleMicMonitoring: () => void
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
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const [localMedia, setLocalMedia] = useState<LocalMediaState>(() => readLobbyMediaState(roomId))
  const localMediaRef = useRef(localMedia)

  const [selectedMicId, setSelectedMicId] = useState(MOCK_MIC_DEVICES[0].deviceId)
  const [selectedCameraId, setSelectedCameraId] = useState(MOCK_CAMERA_DEVICES[0].deviceId)
  const [micDevices, setMicDevices] = useState(MOCK_MIC_DEVICES)
  const [cameraDevices, setCameraDevices] = useState(MOCK_CAMERA_DEVICES)

  // ── Mic monitoring (loopback) ────────────────────────────────────────────
  const [micMonitoring, setMicMonitoring] = useState(false)
  const monitoringAudioRef = useRef<HTMLAudioElement | null>(null)
  const monitoringPeersRef = useRef<RTCPeerConnection[]>([])
  const monitoringAttemptRef = useRef(0)

  /** Tear down any active monitoring source (does NOT close the AudioContext). */
  const stopMonitoringSource = useCallback(() => {
    monitoringAttemptRef.current += 1
    const audio = monitoringAudioRef.current
    if (audio) {
      audio.pause()
      audio.srcObject = null
      monitoringAudioRef.current = null
    }
    monitoringPeersRef.current.forEach((peer) => peer.close())
    monitoringPeersRef.current = []
  }, [])

  /** Connect the current stream to the speakers for monitoring. */
  const startMonitoringSource = useCallback(async (stream: MediaStream) => {
    stopMonitoringSource()
    const [track] = stream.getAudioTracks()
    if (!track?.enabled) return

    const attempt = monitoringAttemptRef.current
    const senderPeer = new RTCPeerConnection()
    const receiverPeer = new RTCPeerConnection()
    monitoringPeersRef.current = [senderPeer, receiverPeer]

    senderPeer.onicecandidate = ({ candidate }) => {
      if (candidate) receiverPeer.addIceCandidate(candidate).catch(() => undefined)
    }
    receiverPeer.onicecandidate = ({ candidate }) => {
      if (candidate) senderPeer.addIceCandidate(candidate).catch(() => undefined)
    }

    const transceiver = senderPeer.addTransceiver(track, {
      direction: 'sendonly',
      streams: [new MediaStream([track])],
    })
    const opusCodecs = RTCRtpReceiver.getCapabilities?.('audio')?.codecs.filter(
      (codec) => codec.mimeType.toLowerCase() === 'audio/opus',
    )
    if (opusCodecs?.length && transceiver.setCodecPreferences) {
      transceiver.setCodecPreferences(opusCodecs)
    }

    const remoteStreamPromise = new Promise<MediaStream>((resolve) => {
      receiverPeer.ontrack = (event) => {
        resolve(event.streams[0] ?? new MediaStream([event.track]))
      }
    })

    try {
      const offer = await senderPeer.createOffer()
      await senderPeer.setLocalDescription(offer)
      await receiverPeer.setRemoteDescription(offer)
      const answer = await receiverPeer.createAnswer()
      await receiverPeer.setLocalDescription(answer)
      await senderPeer.setRemoteDescription(answer)

      const remoteStream = await remoteStreamPromise
      if (attempt !== monitoringAttemptRef.current) return

      const audio = new Audio()
      audio.autoplay = true
      audio.srcObject = remoteStream
      monitoringAudioRef.current = audio
      await audio.play()
    } catch (error) {
      if (attempt === monitoringAttemptRef.current) {
        console.error('[Lobby] No se pudo iniciar la preescucha WebRTC:', error)
        stopMonitoringSource()
        setMicMonitoring(false)
      }
    }
  }, [stopMonitoringSource])

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Tu navegador no permite usar cámara o micrófono.')
      setLocalMedia((prev) => ({ ...prev, isMicOn: false, isCameraOn: false }))
      return
    }

    let cancelled = false

    async function loadDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: createRoomAudioConstraints(),
          video: createLobbyVideoConstraints(),
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localStreamRef.current = stream
        setLocalStream(stream)
        setMediaError(null)

        const audioTrack = stream.getAudioTracks()[0]
        const videoTrack = stream.getVideoTracks()[0]
        setLocalMedia((prev) => {
          const nextMicOn = Boolean(audioTrack) && prev.isMicOn
          const nextCameraOn = Boolean(videoTrack) && prev.isCameraOn

          if (!nextMicOn && audioTrack) {
            audioTrack.enabled = false
          }
          if (!nextCameraOn && videoTrack) {
            videoTrack.stop()
            stream.removeTrack(videoTrack)
          }

          return {
            ...prev,
            isMicOn: nextMicOn,
            isCameraOn: nextCameraOn,
          }
        })

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return

        const audioInputs = devices
          .filter((device) => device.kind === 'audioinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Micrófono ${index + 1}`,
          }))
        const videoInputs = devices
          .filter((device) => device.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Cámara ${index + 1}`,
          }))

        if (audioInputs.length > 0) {
          setMicDevices(audioInputs)
          setSelectedMicId(audioTrack?.getSettings().deviceId ?? audioInputs[0].deviceId)
        }
        if (videoInputs.length > 0) {
          setCameraDevices(videoInputs)
          setSelectedCameraId(videoTrack?.getSettings().deviceId ?? videoInputs[0].deviceId)
        }
      } catch (err: any) {
        if (!cancelled) {
          setLocalMedia((prev) => ({ ...prev, isMicOn: false, isCameraOn: false }))
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setMediaError('Acceso denegado. Por favor, permite el acceso a la cámara y al micrófono en la barra de direcciones.')
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setMediaError('Cámara o micrófono ocupados. Asegúrate de que no estén siendo usados por otra aplicación.')
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setMediaError('No se detectaron dispositivos. Asegúrate de tener una cámara y micrófono conectados.')
          } else {
            setMediaError('No pudimos acceder a la cámara o al micrófono. Verifica tus conexiones.')
          }
        }
      }
    }

    loadDevices()

    return () => {
      cancelled = true
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
  }, [])

  // When the active stream changes (device switch), reconnect monitoring if active
  useEffect(() => {
    if (micMonitoring && localStreamRef.current) {
      startMonitoringSource(localStreamRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream])

  // Cleanup the WebRTC monitor on unmount
  useEffect(() => {
    return () => {
      stopMonitoringSource()
    }
  }, [stopMonitoringSource])

  const restartLocalStream = useCallback(async (nextMicId: string, nextCameraId: string) => {
    if (!navigator.mediaDevices?.getUserMedia) return

    try {
      const previousStream = localStreamRef.current
      const cameraOn = localMediaRef.current.isCameraOn

      const constraints: MediaStreamConstraints = {
        audio: createRoomAudioConstraints(nextMicId || undefined),
      }
      if (cameraOn) {
        constraints.video = createLobbyVideoConstraints(nextCameraId || undefined)
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      previousStream?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = stream
      setLocalStream(stream)
      setMediaError(null)
      setLocalMedia((prev) => {
        const nextMedia = {
          ...prev,
          isMicOn: stream.getAudioTracks().length > 0 && prev.isMicOn,
          isCameraOn: stream.getVideoTracks().length > 0 && prev.isCameraOn,
        }
        stream.getAudioTracks().forEach((track) => {
          track.enabled = nextMedia.isMicOn
        })
        stream.getVideoTracks().forEach((track) => {
          track.enabled = nextMedia.isCameraOn
        })
        return nextMedia
      })
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMediaError('Permisos insuficientes para el dispositivo seleccionado.')
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setMediaError('El dispositivo seleccionado está en uso por otra aplicación.')
      } else {
        setMediaError('No pudimos cambiar al dispositivo seleccionado.')
      }
    }
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
  }, [roomId, getIdToken])

  const waitingParticipants = useMemo(
    () => roomUsers.map((user, index) => toLobbyParticipant(user, index)),
    [roomUsers],
  )

  const toggleMicMonitoring = useCallback(() => {
    setMicMonitoring((prev) => {
      const next = !prev
      if (next) {
        const stream = localStreamRef.current
        if (stream && localMediaRef.current.isMicOn) {
          startMonitoringSource(stream)
        }
      } else {
        stopMonitoringSource()
      }
      return next
    })
  }, [startMonitoringSource, stopMonitoringSource])

  const toggleMic = useCallback(() => {
    setLocalMedia((prev) => {
      const nextMic = !prev.isMicOn
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = nextMic
      })
      // Stop monitoring when mic is muted; restart if it was active when unmuting
      if (!nextMic) {
        stopMonitoringSource()
        setMicMonitoring(false)
      } else if (micMonitoring && localStreamRef.current) {
        startMonitoringSource(localStreamRef.current)
      }
      return { ...prev, isMicOn: nextMic }
    })
  }, [micMonitoring, startMonitoringSource, stopMonitoringSource])

  const toggleCamera = useCallback(async () => {
    const nextCamera = !localMediaRef.current.isCameraOn

    if (!nextCamera) {
      localStreamRef.current?.getVideoTracks().forEach((track) => {
        track.stop()
        localStreamRef.current?.removeTrack(track)
      })
      setLocalMedia((prev) => ({ ...prev, isCameraOn: false }))
    } else {
      if (!navigator.mediaDevices?.getUserMedia) return

      try {
        setMediaError(null)
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: createLobbyVideoConstraints(selectedCameraId || undefined),
        })
        const track = videoStream.getVideoTracks()[0]
        if (track) {
          track.enabled = true
          localStreamRef.current?.getVideoTracks().forEach((t) => {
            t.stop()
            localStreamRef.current?.removeTrack(t)
          })
          if (localStreamRef.current) {
            localStreamRef.current.addTrack(track)
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()))
          } else {
            const newStream = new MediaStream([track])
            localStreamRef.current = newStream
            setLocalStream(newStream)
          }
        }
        setLocalMedia((prev) => ({ ...prev, isCameraOn: true }))
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMediaError('Acceso denegado a la cámara. Por favor permite los permisos en tu navegador.')
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setMediaError('La cámara está en uso por otra aplicación.')
        } else {
          setMediaError('No pudimos acceder a la cámara.')
        }
      }
    }
  }, [selectedCameraId])

  const updateSelectedMicId = useCallback((id: string) => {
    setSelectedMicId(id)
    restartLocalStream(id, selectedCameraId)
  }, [restartLocalStream, selectedCameraId])

  const updateSelectedCameraId = useCallback((id: string) => {
    setSelectedCameraId(id)
    restartLocalStream(selectedMicId, id)
  }, [restartLocalStream, selectedMicId])

  useEffect(() => {
    if (!roomId) return
    sessionStorage.setItem(
      getRoomLobbyMediaPrefsKey(roomId),
      JSON.stringify({
        isMicOn: localMedia.isMicOn,
        isCameraOn: localMedia.isCameraOn,
        selectedMicId,
        selectedCameraId,
      }),
    )
  }, [localMedia.isCameraOn, localMedia.isMicOn, roomId, selectedCameraId, selectedMicId])

  const joinRoom = useCallback(() => {
    isJoiningRoomRef.current = true
    writeLobbyMediaState(roomId, localMedia)
    sessionStorage.setItem(
      getRoomLobbyMediaPrefsKey(roomId),
      JSON.stringify({
        isMicOn: localMedia.isMicOn,
        isCameraOn: localMedia.isCameraOn,
        selectedMicId,
        selectedCameraId,
      }),
    )
    navigate(`/room/${roomId}`)
  }, [localMedia, navigate, roomId, selectedCameraId, selectedMicId])

  return {
    localMedia,
    localStream,
    selectedMicId,
    selectedCameraId,
    micDevices,
    cameraDevices,
    waitingParticipants,
    loadingParticipants,
    previewError,
    mediaError,
    micMonitoring,
    toggleMic,
    toggleCamera,
    toggleMicMonitoring,
    setSelectedMicId: updateSelectedMicId,
    setSelectedCameraId: updateSelectedCameraId,
    joinRoom,
  }
}
