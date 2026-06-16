import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { connectSocket, disconnectSocket, getSocket } from '@/config/socket.config'
import { getRoomMessages } from '../api/chatApi'
import { getRoomMembers } from '../api/roomsApi'
import {
  ROOM_DELETED_REASON,
  createRoomDeletedDashboardState,
} from '../constants/roomDeletionNotice'
import { readRoomLobbyMediaPrefs } from '../constants/roomMediaPrefs'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import { readLobbyMediaState, writeLobbyMediaState } from '../utils/lobbyMediaState'
import type {
  LocalMediaState,
  RoomChatMessage,
  RoomParticipant,
  RoomSessionActions,
  RoomSessionState,
} from '../types/roomSession'
import type { RoomMember } from '@/types/room'

interface UseRoomSessionResult {
  session: RoomSessionState
  actions: RoomSessionActions
  joinWarningMessage: string | null
  clearJoinWarning: () => void
}

interface RoomDeletedPayload {
  roomId: string
  deletedBy: string
  reason: string
}

interface RoomUserPresencePayload {
  socketId: string
  uid: string | null
  username?: string | null
  name?: string | null
  avatarUrl?: string | null
  roomId?: string | null
  isMuted?: boolean
  isVideoOff?: boolean
  isScreenSharing?: boolean
}

interface WebRtcOfferPayload {
  fromSocketId: string
  roomId: string
  offer: RTCSessionDescriptionInit
}

interface WebRtcAnswerPayload {
  fromSocketId: string
  roomId: string
  answer: RTCSessionDescriptionInit
}

interface WebRtcIceCandidatePayload {
  fromSocketId: string
  roomId: string
  candidate: RTCIceCandidateInit
}

interface SpeakingDetector {
  stream: MediaStream
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  data: Uint8Array
  intervalId: number
  isSpeaking: boolean
}

function resolveParticipantProfile(
  user: RoomUserPresencePayload,
  memberByUid: Map<string, RoomMember>,
) {
  const member = user.uid ? memberByUid.get(user.uid) : undefined
  const username = member?.username?.trim() || user.username?.trim()

  return {
    displayName:
      username ||
      member?.displayName?.trim() ||
      user.name?.trim() ||
      user.uid?.slice(0, 8) ||
      user.socketId.slice(0, 8),
    avatarUrl: member?.avatarUrl ?? user.avatarUrl ?? undefined,
  }
}

function toRoomParticipants(
  users: RoomUserPresencePayload[],
  roomId: string,
  memberByUid: Map<string, RoomMember>,
  localUserUid?: string,
  localStream?: MediaStream | null,
  remoteStreams: Map<string, MediaStream> = new Map(),
): RoomParticipant[] {
  return users
    .filter((user) => user.socketId.trim() && (!user.roomId || user.roomId === roomId))
    .map((user) => {
      const profile = resolveParticipantProfile(user, memberByUid)
      const isLocal = user.uid === localUserUid

      return {
        id: user.uid ?? user.socketId,
        socketId: user.socketId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        isLocal,
        isCameraOn: !user.isVideoOff,
        isMicOn: !user.isMuted,
        isScreenSharing: Boolean(user.isScreenSharing),
        // FIX: si la cámara está apagada, pasar null → VideoGrid muestra avatar en vez de pantalla negra
        videoStream: isLocal
          ? (user.isVideoOff ? null : localStream ?? null)
          : remoteStreams.get(user.socketId) ?? null,
      }
    })
}

const defaultIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

function cleanIceServerValue(value: string): string {
  return value.trim().replace(/^["']+|["']+$/g, '')
}

function getPeerConnectionConfig(): RTCConfiguration {
  const turnUrls = (import.meta.env.VITE_TURN_URL as string | undefined)
    ?.split(',')
    .map(cleanIceServerValue)
    .filter(Boolean)

  if (!turnUrls?.length) {
    return { iceServers: defaultIceServers }
  }

  const username = cleanIceServerValue(
    (import.meta.env.VITE_TURN_USERNAME as string | undefined) ?? '',
  )
  const credential = cleanIceServerValue(
    (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) ?? '',
  )

  return {
    iceServers: [
      ...defaultIceServers,
      {
        urls: turnUrls,
        ...(username ? { username } : {}),
        ...(credential ? { credential } : {}),
      },
    ],
  }
}

function createMediaConstraints(
  selectedMicId?: string,
  selectedCameraId?: string,
  facingMode: 'user' | 'environment' = 'user',
): MediaStreamConstraints {
  return {
    audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
    video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode },
  }
}

export function useRoomSession(roomId: string, roomCode?: string): UseRoomSessionResult {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const firebaseUser = useAuthStore((s) => s.user)
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const lobbyMediaPrefs = useMemo(() => readRoomLobbyMediaPrefs(roomId), [roomId])
  const initialLobbyMedia = useMemo(() => readLobbyMediaState(roomId), [roomId])

  const localUser = useMemo(
    () => ({
      id: firebaseUser?.uid ?? 'local-user',
      displayName: profile?.username ?? firebaseUser?.displayName ?? 'Usuario',
      avatarUrl: profile?.avatarUrl ?? firebaseUser?.photoURL ?? undefined,
    }),
    [profile, firebaseUser],
  )

  const initialMedia = useMemo<LocalMediaState>(() => ({
    isMicOn: lobbyMediaPrefs?.isMicOn ?? initialLobbyMedia.isMicOn,
    isCameraOn: lobbyMediaPrefs?.isCameraOn ?? initialLobbyMedia.isCameraOn,
    isScreenSharing: false,
  }), [initialLobbyMedia, lobbyMediaPrefs])

  const [session, setSession] = useState<RoomSessionState>(() => ({
    roomId,
    roomName: '',
    roomCode: roomCode ?? '',
    connectionStatus: 'disconnected',
    localMedia: initialMedia,
    mirrorLocalVideo: true,
    outputVolume: 80,
    cameraFacingMode: 'user',
    participants: [
      {
        id: localUser.id,
        socketId: 'local-user',
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl,
        isLocal: true,
        isCameraOn: initialMedia.isCameraOn,
        isMicOn: initialMedia.isMicOn,
      },
    ],
    messages: [],
    loadingHistory: false,
    hasMoreHistory: false,
  }))
  const [joinWarningMessage, setJoinWarningMessage] = useState<string | null>(null)

  const nextCursorRef = useRef<string | null>(null)
  const loadingHistoryRef = useRef(false)
  const memberByUidRef = useRef(new Map<string, RoomMember>())
  const roomUsersRef = useRef<RoomUserPresencePayload[]>([])
  const localMediaRef = useRef<LocalMediaState>(initialMedia)
  const cameraFacingModeRef = useRef<'user' | 'environment'>('user')
  const localStreamRef = useRef<MediaStream | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  const cameraWasOnBeforeScreenShareRef = useRef(false)
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>())
  const remoteStreamsRef = useRef(new Map<string, MediaStream>())
  const pendingIceCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const offeredPeersRef = useRef(new Set<string>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const speakingDetectorsRef = useRef(new Map<string, SpeakingDetector>())

  const closeSpeakingDetector = useCallback((socketId: string) => {
    const detector = speakingDetectorsRef.current.get(socketId)
    if (!detector) return

    window.clearInterval(detector.intervalId)
    detector.source.disconnect()
    speakingDetectorsRef.current.delete(socketId)
  }, [])

  const syncSpeakingDetectors = useCallback((participants: RoomParticipant[]) => {
    const liveSocketIds = new Set(participants.map((participant) => participant.socketId))

    speakingDetectorsRef.current.forEach((_, socketId) => {
      if (!liveSocketIds.has(socketId)) {
        closeSpeakingDetector(socketId)
      }
    })

    participants.forEach((participant) => {
      const stream = participant.videoStream
      const hasLiveAudio = stream?.getAudioTracks().some(
        (track) => track.readyState === 'live',
      )

      if (!stream || !hasLiveAudio) {
        closeSpeakingDetector(participant.socketId)
        return
      }

      const existing = speakingDetectorsRef.current.get(participant.socketId)
      if (existing?.stream === stream) return

      closeSpeakingDetector(participant.socketId)

      const AudioContextConstructor = window.AudioContext
      if (!AudioContextConstructor) return

      const audioContext = audioContextRef.current ?? new AudioContextConstructor()
      audioContextRef.current = audioContext
      audioContext.resume().catch(() => undefined)

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.72

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      const detector: SpeakingDetector = {
        stream,
        source,
        analyser,
        data,
        intervalId: 0,
        isSpeaking: false,
      }

      detector.intervalId = window.setInterval(() => {
        const audioEnabled = stream.getAudioTracks().some(
          (track) => track.enabled && track.readyState === 'live',
        )

        if (!audioEnabled) {
          if (detector.isSpeaking) {
            detector.isSpeaking = false
            setSession((prev) => ({
              ...prev,
              participants: prev.participants.map((item) =>
                item.socketId === participant.socketId ? { ...item, isSpeaking: false } : item,
              ),
            }))
          }
          return
        }

        analyser.getByteTimeDomainData(data)
        const averageVolume =
          data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length
        const nextSpeaking = averageVolume > 8

        if (nextSpeaking === detector.isSpeaking) return

        detector.isSpeaking = nextSpeaking
        setSession((prev) => ({
          ...prev,
          participants: prev.participants.map((item) =>
            item.socketId === participant.socketId
              ? { ...item, isSpeaking: nextSpeaking }
              : item,
          ),
        }))
      }, 180)

      speakingDetectorsRef.current.set(participant.socketId, detector)
    })
  }, [closeSpeakingDetector])

  useEffect(() => {
    if (!roomCode) return
    setSession((prev) => ({ ...prev, roomCode }))
  }, [roomCode])

  useEffect(() => {
    localMediaRef.current = session.localMedia
    writeLobbyMediaState(roomId, session.localMedia)
  }, [roomId, session.localMedia])

  useEffect(() => {
    syncSpeakingDetectors(session.participants)
  }, [session.participants, syncSpeakingDetectors])

  const setParticipantsFromPresence = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      participants: toRoomParticipants(
        roomUsersRef.current,
        roomId,
        memberByUidRef.current,
        firebaseUser?.uid,
        // FIX: si la cámara local está apagada, pasar null para que aparezca el avatar
        localMediaRef.current.isCameraOn ? localStreamRef.current : null,
        remoteStreamsRef.current,
      ),
    }))
  }, [firebaseUser?.uid, roomId])

  const emitMediaStatus = useCallback((media: LocalMediaState) => {
    const socket = getSocket()
    if (!socket?.connected) return

    socket.emit(ROOM_SOCKET_EVENTS.MEDIA_STATUS, {
      roomId,
      isMuted: !media.isMicOn,
      isVideoOff: !media.isCameraOn,
      isScreenSharing: media.isScreenSharing,
    })
  }, [roomId])

  const emitJoinRoom = useCallback(() => {
    const socket = getSocket()
    if (!socket?.connected) return

    socket.emit(ROOM_SOCKET_EVENTS.NEW_USER)
    socket.emit(ROOM_SOCKET_EVENTS.JOIN_ROOM, { roomId })
  }, [roomId])

  const closePeerConnection = useCallback((remoteSocketId: string) => {
    peerConnectionsRef.current.get(remoteSocketId)?.close()
    peerConnectionsRef.current.delete(remoteSocketId)
    remoteStreamsRef.current.delete(remoteSocketId)
    pendingIceCandidatesRef.current.delete(remoteSocketId)
    offeredPeersRef.current.delete(remoteSocketId)
    setParticipantsFromPresence()
  }, [setParticipantsFromPresence])

  const flushPendingIceCandidates = useCallback(async (remoteSocketId: string) => {
    const pc = peerConnectionsRef.current.get(remoteSocketId)
    const pending = pendingIceCandidatesRef.current.get(remoteSocketId)
    if (!pc || !pending?.length || !pc.remoteDescription) return

    pendingIceCandidatesRef.current.delete(remoteSocketId)
    await Promise.all(
      pending.map((candidate) => pc.addIceCandidate(new RTCIceCandidate(candidate))),
    )
  }, [])

  const createPeerConnection = useCallback((remoteSocketId: string) => {
    const existing = peerConnectionsRef.current.get(remoteSocketId)
    if (existing) return existing

    const pc = new RTCPeerConnection(getPeerConnectionConfig())
    peerConnectionsRef.current.set(remoteSocketId, pc)

    localStreamRef.current?.getTracks().forEach((track) => {
      const stream = localStreamRef.current
      if (stream) pc.addTrack(track, stream)
    })

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      const socket = getSocket()
      if (!socket?.connected) return

      socket.emit(ROOM_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, {
        roomId,
        toSocketId: remoteSocketId,
        candidate: event.candidate.toJSON(),
      })
    }

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (!remoteStream) return

      remoteStreamsRef.current.set(remoteSocketId, remoteStream)
      setParticipantsFromPresence()
    }

    pc.onconnectionstatechange = () => {
      if (['closed', 'disconnected', 'failed'].includes(pc.connectionState)) {
        closePeerConnection(remoteSocketId)
      }
    }

    return pc
  }, [closePeerConnection, roomId, setParticipantsFromPresence])

  const syncPeerConnections = useCallback(async (users: RoomUserPresencePayload[]) => {
    const socket = getSocket()
    const localSocketId = socket?.id
    if (!socket?.connected || !localSocketId) return

    const remoteSocketIds = users
      .map((user) => user.socketId)
      .filter((socketId) => socketId && socketId !== localSocketId)

    peerConnectionsRef.current.forEach((_, socketId) => {
      if (!remoteSocketIds.includes(socketId)) {
        closePeerConnection(socketId)
      }
    })

    await Promise.all(remoteSocketIds.map(async (remoteSocketId) => {
      const pc = createPeerConnection(remoteSocketId)
      if (
        localSocketId <= remoteSocketId ||
        offeredPeersRef.current.has(remoteSocketId) ||
        pc.signalingState !== 'stable'
      ) {
        return
      }

      offeredPeersRef.current.add(remoteSocketId)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socket.emit(ROOM_SOCKET_EVENTS.WEBRTC_OFFER, {
        roomId,
        toSocketId: remoteSocketId,
        offer,
      })
    }))
  }, [closePeerConnection, createPeerConnection, roomId])

  const replaceOutgoingVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    await Promise.all(
      Array.from(peerConnectionsRef.current.values()).map(async (pc) => {
        const sender = pc.getSenders().find((item) => item.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(track)
        } else if (track && localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current)
        }
      }),
    )
  }, [])

  const setLocalPreviewVideoTrack = useCallback((track: MediaStreamTrack | null) => {
    const stream = localStreamRef.current
    if (!stream) return

    stream.getVideoTracks().forEach((existingTrack) => {
      if (existingTrack !== track) {
        stream.removeTrack(existingTrack)
      }
    })

    if (track && !stream.getVideoTracks().includes(track)) {
      stream.addTrack(track)
    }

    setParticipantsFromPresence()
  }, [setParticipantsFromPresence])

  const replaceLocalCameraTrack = useCallback(async (
    nextTrack: MediaStreamTrack,
    shouldEnable: boolean,
  ) => {
    const previousTrack = cameraTrackRef.current
    nextTrack.enabled = shouldEnable

    cameraTrackRef.current = nextTrack
    setLocalPreviewVideoTrack(screenTrackRef.current ?? nextTrack)
    await replaceOutgoingVideoTrack(screenTrackRef.current ?? nextTrack)
    previousTrack?.stop()

    setParticipantsFromPresence()
  }, [replaceOutgoingVideoTrack, setLocalPreviewVideoTrack, setParticipantsFromPresence])

  const cleanupWebRtc = useCallback(() => {
    speakingDetectorsRef.current.forEach((_, socketId) => {
      closeSpeakingDetector(socketId)
    })
    audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    offeredPeersRef.current.clear()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    cameraTrackRef.current = null
    screenTrackRef.current?.stop()
    screenTrackRef.current = null
  }, [closeSpeakingDetector])

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const token = await getIdToken()
        if (cancelled) return
        const roomMembers = await getRoomMembers(token, roomId).catch(() => [])
        if (cancelled) return
        memberByUidRef.current = new Map(roomMembers.map((member) => [member.uid, member]))

        if (!localStreamRef.current && navigator.mediaDevices?.getUserMedia) {
          try {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia(
              createMediaConstraints(
                lobbyMediaPrefs?.selectedMicId,
                lobbyMediaPrefs?.selectedCameraId,
                cameraFacingModeRef.current,
              ),
            )
          } catch {
            try {
              localStreamRef.current = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
              })
            } catch {
              try {
                localStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
              } catch {
                try {
                  localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true })
                } catch {
                  localStreamRef.current = new MediaStream()
                }
              }
            }
          }

          cameraTrackRef.current = localStreamRef.current.getVideoTracks()[0] ?? null
          const hasAudio = localStreamRef.current.getAudioTracks().length > 0
          const hasVideo = localStreamRef.current.getVideoTracks().length > 0
          const nextMicOn = hasAudio && initialMedia.isMicOn
          const nextCameraOn = hasVideo && initialMedia.isCameraOn

          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = nextMicOn
          })

          // FIX: Si la cámara arranca apagada, detener el track inmediatamente
          // para liberar el hardware (LED apagado) en lugar de solo deshabilitar
          if (!nextCameraOn && cameraTrackRef.current) {
            cameraTrackRef.current.stop()
            localStreamRef.current.removeTrack(cameraTrackRef.current)
            cameraTrackRef.current = null
          }

          const nextMedia = {
            ...initialMedia,
            isMicOn: nextMicOn,
            isCameraOn: nextCameraOn,
          }
          localMediaRef.current = nextMedia

          setSession((prev) => ({
            ...prev,
            localMedia: nextMedia,
            participants: prev.participants.map((participant) =>
              participant.isLocal
                ? {
                    ...participant,
                    isMicOn: nextMicOn,
                    isCameraOn: nextCameraOn,
                    // FIX: si la cámara está apagada, videoStream null → muestra el avatar
                    // en lugar de una pantalla negra con el track deshabilitado
                    videoStream: nextCameraOn ? localStreamRef.current : null,
                  }
                : participant,
            ),
          }))
        }

        const socket = connectSocket(token)

        setSession((prev) => ({ ...prev, connectionStatus: 'connecting' }))

        socket.on(ROOM_SOCKET_EVENTS.CONNECT, () => {
          if (cancelled) return
          setSession((prev) => ({ ...prev, connectionStatus: 'connected' }))
          emitJoinRoom()
        })

        socket.on(ROOM_SOCKET_EVENTS.DISCONNECT, () => {
          if (cancelled) return
          setSession((prev) => ({ ...prev, connectionStatus: 'disconnected' }))
        })

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

        socket.on(ROOM_SOCKET_EVENTS.ROOM_USERS, async (users: RoomUserPresencePayload[]) => {
          if (cancelled) return
          roomUsersRef.current = users

          // FIX: para el usuario local, usar el estado conocido localmente (localMediaRef)
          // en lugar de confiar en lo que el servidor devuelve, que puede estar desactualizado
          const localCameraOn = localMediaRef.current.isCameraOn
          const participants = toRoomParticipants(
            users,
            roomId,
            memberByUidRef.current,
            firebaseUser?.uid,
            // Si la cámara local está apagada, pasar null para mostrar avatar
            localCameraOn ? localStreamRef.current : null,
            remoteStreamsRef.current,
          )

          setSession((prev) => ({
            ...prev,
            participants,
          }))
          emitMediaStatus(localMediaRef.current)
          syncPeerConnections(users).catch((err) => {
            console.error('[WebRTC] sync peers failed:', err)
          })
        })

        socket.on(ROOM_SOCKET_EVENTS.MEDIA_STATUS, (user: RoomUserPresencePayload) => {
          if (cancelled || user.roomId !== roomId) return

          roomUsersRef.current = roomUsersRef.current.map((roomUser) =>
            roomUser.socketId === user.socketId ? { ...roomUser, ...user } : roomUser,
          )

          setSession((prev) => {
            const isLocalStatus = user.uid === firebaseUser?.uid
            const nextLocalMedia = isLocalStatus
              ? {
                  ...prev.localMedia,
                  isMicOn: !user.isMuted,
                  isCameraOn: !user.isVideoOff,
                  isScreenSharing: Boolean(user.isScreenSharing),
                }
              : prev.localMedia

            if (isLocalStatus) {
              localMediaRef.current = nextLocalMedia
              writeLobbyMediaState(roomId, nextLocalMedia)
            }

            return {
              ...prev,
              localMedia: nextLocalMedia,
              participants: prev.participants.map((participant) => {
                if (participant.socketId !== user.socketId && participant.id !== user.uid) {
                  return participant
                }
                const cameraOn = !user.isVideoOff
                const isLocalParticipant = participant.isLocal
                return {
                  ...participant,
                  isCameraOn: cameraOn,
                  isMicOn: !user.isMuted,
                  isScreenSharing: Boolean(user.isScreenSharing),
                  // FIX: si la cámara está apagada, videoStream null → avatar en vez de negro
                  videoStream: isLocalParticipant
                    ? (cameraOn ? localStreamRef.current : null)
                    : participant.videoStream,
                }
              }),
            }
          })
        })

        socket.on(ROOM_SOCKET_EVENTS.WEBRTC_OFFER, async (payload: WebRtcOfferPayload) => {
          if (cancelled || payload.roomId !== roomId) return

          const pc = createPeerConnection(payload.fromSocketId)
          await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
          await flushPendingIceCandidates(payload.fromSocketId)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit(ROOM_SOCKET_EVENTS.WEBRTC_ANSWER, {
            roomId,
            toSocketId: payload.fromSocketId,
            answer,
          })
        })

        socket.on(ROOM_SOCKET_EVENTS.WEBRTC_ANSWER, async (payload: WebRtcAnswerPayload) => {
          if (cancelled || payload.roomId !== roomId) return

          const pc = peerConnectionsRef.current.get(payload.fromSocketId)
          if (!pc || pc.signalingState === 'stable') return

          await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
          await flushPendingIceCandidates(payload.fromSocketId)
        })

        socket.on(ROOM_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, async (payload: WebRtcIceCandidatePayload) => {
          if (cancelled || payload.roomId !== roomId) return

          const pc = createPeerConnection(payload.fromSocketId)
          if (!pc.remoteDescription) {
            const pending = pendingIceCandidatesRef.current.get(payload.fromSocketId) ?? []
            pending.push(payload.candidate)
            pendingIceCandidatesRef.current.set(payload.fromSocketId, pending)
            return
          }

          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
        })

        socket.on(ROOM_SOCKET_EVENTS.ERROR_MESSAGE, (err: { code?: string; message?: string }) => {
          if (err.code === 'ALREADY_IN_ROOM') {
            setJoinWarningMessage(
              err.message ??
                'Ya te encuentras conectado a esta sala desde otra pestaña o dispositivo.',
            )
            setSession((prev) => ({ ...prev, connectionStatus: 'disconnected' }))
            cleanupWebRtc()
            disconnectSocket()
            return
          }
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

        if (socket.connected) {
          setSession((prev) => ({ ...prev, connectionStatus: 'connected' }))
          emitJoinRoom()
        }

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
        socket.off(ROOM_SOCKET_EVENTS.MEDIA_STATUS)
        socket.off(ROOM_SOCKET_EVENTS.WEBRTC_OFFER)
        socket.off(ROOM_SOCKET_EVENTS.WEBRTC_ANSWER)
        socket.off(ROOM_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE)
        socket.off(ROOM_SOCKET_EVENTS.ERROR_MESSAGE)
        socket.off(ROOM_SOCKET_EVENTS.ROOM_DELETED)
      }
      cleanupWebRtc()
      disconnectSocket()
    }
  }, [
    cleanupWebRtc,
    createPeerConnection,
    emitJoinRoom,
    emitMediaStatus,
    firebaseUser?.uid,
    flushPendingIceCandidates,
    getIdToken,
    initialMedia,
    lobbyMediaPrefs,
    navigate,
    roomId,
    syncPeerConnections,
  ])

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

  const toggleMic = useCallback(() => {
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? []
    const nextMic = !session.localMedia.isMicOn
    audioTracks.forEach((track) => {
      track.enabled = nextMic
    })

    const nextMedia = { ...session.localMedia, isMicOn: nextMic }
    localMediaRef.current = nextMedia
    writeLobbyMediaState(roomId, nextMedia)
    setSession((prev) => ({
      ...prev,
      localMedia: nextMedia,
      participants: prev.participants.map((p) =>
        p.isLocal ? { ...p, isMicOn: nextMic } : p,
      ),
    }))
    emitMediaStatus(nextMedia)
  }, [emitMediaStatus, roomId, session.localMedia])

  // FIX: toggleCamera ahora usa track.stop() para liberar el hardware (apaga el LED de la cámara)
  // y getUserMedia para adquirir un nuevo track al encender, en lugar de solo track.enabled
  const toggleCamera = useCallback(async () => {
    const nextCam = !session.localMedia.isCameraOn

    if (!nextCam) {
      // APAGAR: detener tracks para liberar el hardware completamente
      if (screenTrackRef.current) {
        screenTrackRef.current.stop()
        screenTrackRef.current = null
      }

      const videoTrack = cameraTrackRef.current
      if (videoTrack) {
        videoTrack.stop()
        cameraTrackRef.current = null
      }

      // Limpiar video tracks del stream local
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          localStreamRef.current!.removeTrack(t)
        })
      }

      await replaceOutgoingVideoTrack(null)

      const nextMedia = {
        ...session.localMedia,
        isCameraOn: false,
        isScreenSharing: false,
      }
      localMediaRef.current = nextMedia
      writeLobbyMediaState(roomId, nextMedia)
      setSession((prev) => ({
        ...prev,
        localMedia: nextMedia,
        participants: prev.participants.map((p) =>
          // videoStream: null → el VideoGrid muestra el avatar en lugar de pantalla negra
          p.isLocal ? { ...p, isCameraOn: false, isScreenSharing: false, videoStream: null } : p,
        ),
      }))
      emitMediaStatus(nextMedia)

    } else {
      // ENCENDER: adquirir nuevo track desde getUserMedia (el anterior fue detenido)
      if (!navigator.mediaDevices?.getUserMedia) return

      let newTrack: MediaStreamTrack | null = null
      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          createMediaConstraints(undefined, undefined, cameraFacingModeRef.current),
        )
        newTrack = stream.getVideoTracks()[0] ?? null
      } catch (err) {
        console.error('[WebRTC] re-acquire camera failed:', err)
        return
      }

      if (!newTrack) return

      newTrack.enabled = true
      cameraTrackRef.current = newTrack

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          localStreamRef.current!.removeTrack(t)
        })
        localStreamRef.current.addTrack(newTrack)
      }

      await replaceOutgoingVideoTrack(newTrack)

      const nextMedia = { ...session.localMedia, isCameraOn: true }
      localMediaRef.current = nextMedia
      writeLobbyMediaState(roomId, nextMedia)
      setSession((prev) => ({
        ...prev,
        localMedia: nextMedia,
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isCameraOn: true, videoStream: localStreamRef.current } : p,
        ),
      }))
      emitMediaStatus(nextMedia)
    }
  }, [emitMediaStatus, replaceOutgoingVideoTrack, roomId, session.localMedia])

  const toggleScreenShare = useCallback(async () => {
    if (session.localMedia.isScreenSharing) {
      const currentScreenTrack = screenTrackRef.current
      screenTrackRef.current = null
      currentScreenTrack?.stop()

      const shouldRestoreCamera = cameraWasOnBeforeScreenShareRef.current
      const cameraTrack = cameraTrackRef.current
      if (cameraTrack) {
        cameraTrack.enabled = shouldRestoreCamera
      }

      setLocalPreviewVideoTrack(shouldRestoreCamera ? cameraTrack : null)
      await replaceOutgoingVideoTrack(shouldRestoreCamera ? cameraTrack : null)

      const nextMedia = {
        ...session.localMedia,
        isCameraOn: shouldRestoreCamera,
        isScreenSharing: false,
      }
      localMediaRef.current = nextMedia
      writeLobbyMediaState(roomId, nextMedia)
      setSession((prev) => ({
        ...prev,
        localMedia: nextMedia,
        participants: prev.participants.map((participant) =>
          participant.isLocal
            ? {
                ...participant,
                isCameraOn: shouldRestoreCamera,
                isScreenSharing: false,
                videoStream: localStreamRef.current,
              }
            : participant,
        ),
      }))
      emitMediaStatus(nextMedia)
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) return

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const [screenTrack] = screenStream.getVideoTracks()
      if (!screenTrack) return

      cameraWasOnBeforeScreenShareRef.current = session.localMedia.isCameraOn
      screenTrackRef.current = screenTrack
      setLocalPreviewVideoTrack(screenTrack)
      await replaceOutgoingVideoTrack(screenTrack)

      screenTrack.onended = () => {
        if (screenTrackRef.current !== screenTrack) return
        screenTrackRef.current = null
        const shouldRestoreCamera = cameraWasOnBeforeScreenShareRef.current
        const cameraTrack = cameraTrackRef.current
        if (cameraTrack) {
          cameraTrack.enabled = shouldRestoreCamera
        }
        setLocalPreviewVideoTrack(shouldRestoreCamera ? cameraTrack : null)
        replaceOutgoingVideoTrack(shouldRestoreCamera ? cameraTrack : null).catch((err) => {
          console.error('[WebRTC] restore camera track failed:', err)
        })
        setSession((prev) => {
          const nextMedia = {
            ...prev.localMedia,
            isCameraOn: shouldRestoreCamera,
            isScreenSharing: false,
          }
          localMediaRef.current = nextMedia
          writeLobbyMediaState(roomId, nextMedia)
          emitMediaStatus(nextMedia)
          return {
            ...prev,
            localMedia: nextMedia,
            participants: prev.participants.map((participant) =>
              participant.isLocal
                ? {
                    ...participant,
                    isCameraOn: shouldRestoreCamera,
                    isScreenSharing: false,
                    videoStream: localStreamRef.current,
                  }
                : participant,
            ),
          }
        })
      }

      const nextMedia = {
        ...session.localMedia,
        isScreenSharing: true,
        isCameraOn: true,
      }
      localMediaRef.current = nextMedia
      writeLobbyMediaState(roomId, nextMedia)
      setSession((prev) => ({
        ...prev,
        localMedia: nextMedia,
        participants: prev.participants.map((participant) =>
          participant.isLocal
            ? {
                ...participant,
                isCameraOn: true,
                isScreenSharing: true,
                videoStream: localStreamRef.current,
              }
            : participant,
        ),
      }))
      emitMediaStatus(nextMedia)
    } catch (err) {
      console.error('[WebRTC] screen share failed:', err)
    }
  }, [emitMediaStatus, replaceOutgoingVideoTrack, roomId, session.localMedia, setLocalPreviewVideoTrack])

  const toggleMirrorLocalVideo = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      mirrorLocalVideo: !prev.mirrorLocalVideo,
    }))
  }, [])

  const setOutputVolume = useCallback((volume: number) => {
    const nextVolume = Math.min(100, Math.max(0, Math.round(volume)))
    setSession((prev) => ({
      ...prev,
      outputVolume: nextVolume,
    }))
  }, [])

  const switchCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return

    const nextFacingMode = cameraFacingModeRef.current === 'user' ? 'environment' : 'user'

    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: nextFacingMode } },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacingMode },
        })
      }
      const [nextTrack] = stream.getVideoTracks()
      if (!nextTrack) return

      cameraFacingModeRef.current = nextFacingMode
      await replaceLocalCameraTrack(nextTrack, session.localMedia.isCameraOn)
      setSession((prev) => ({
        ...prev,
        cameraFacingMode: nextFacingMode,
        participants: prev.participants.map((participant) =>
          participant.isLocal
            ? { ...participant, videoStream: localStreamRef.current }
            : participant,
        ),
      }))
    } catch (err) {
      console.error('[WebRTC] switch camera failed:', err)
    }
  }, [replaceLocalCameraTrack, session.localMedia.isCameraOn])

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
    toggleMirrorLocalVideo,
    setOutputVolume,
    switchCamera,
    sendMessage,
    leaveRoom,
    loadMoreHistory,
  }

  const clearJoinWarning = useCallback(() => {
    setJoinWarningMessage(null)
  }, [])

  return { session, actions, joinWarningMessage, clearJoinWarning }
}