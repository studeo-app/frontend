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
import type {
  RoomChatMessage,
  LocalMediaState,
  RoomParticipant,
  RoomSessionActions,
  RoomSessionState,
} from '../types/roomSession'
import type { RoomMember } from '@/types/room'

interface UseRoomSessionResult {
  session: RoomSessionState
  actions: RoomSessionActions
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
        videoStream: isLocal ? localStream ?? null : remoteStreams.get(user.socketId) ?? null,
      }
    })
}

const defaultIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]

function getPeerConnectionConfig(): RTCConfiguration {
  const turnUrls = (import.meta.env.VITE_TURN_URL as string | undefined)
    ?.split(',')
    .map((url) => url.trim())
    .filter(Boolean)

  if (!turnUrls?.length) {
    return { iceServers: defaultIceServers }
  }

  const username = (import.meta.env.VITE_TURN_USERNAME as string | undefined)?.trim()
  const credential = (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined)?.trim()

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
): MediaStreamConstraints {
  return {
    audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
    video: selectedCameraId ? { deviceId: { exact: selectedCameraId } } : true,
  }
}

export function useRoomSession(roomId: string, roomCode?: string): UseRoomSessionResult {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const firebaseUser = useAuthStore((s) => s.user)
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const lobbyMediaPrefs = useMemo(() => readRoomLobbyMediaPrefs(roomId), [roomId])

  const localUser = useMemo(
    () => ({
      id: firebaseUser?.uid ?? 'local-user',
      displayName: profile?.username ?? firebaseUser?.displayName ?? 'Usuario',
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
      isMicOn: lobbyMediaPrefs?.isMicOn ?? false,
      isCameraOn: lobbyMediaPrefs?.isCameraOn ?? true,
      isScreenSharing: false,
    },
    participants: [
      {
        id: localUser.id,
        socketId: 'local-user',
        displayName: localUser.displayName,
        avatarUrl: localUser.avatarUrl,
        isLocal: true,
        isCameraOn: lobbyMediaPrefs?.isCameraOn ?? true,
        isMicOn: lobbyMediaPrefs?.isMicOn ?? false,
      },
    ],
    messages: [],
    loadingHistory: false,
    hasMoreHistory: false,
  }))

  // ── Refs para paginación del historial ────────────────────────────
  const nextCursorRef = useRef<string | null>(null)
  const loadingHistoryRef = useRef(false)
  const memberByUidRef = useRef(new Map<string, RoomMember>())
  const roomUsersRef = useRef<RoomUserPresencePayload[]>([])
  const localMediaRef = useRef<LocalMediaState>({
    isMicOn: lobbyMediaPrefs?.isMicOn ?? false,
    isCameraOn: lobbyMediaPrefs?.isCameraOn ?? true,
    isScreenSharing: false,
  })
  const localStreamRef = useRef<MediaStream | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>())
  const remoteStreamsRef = useRef(new Map<string, MediaStream>())
  const pendingIceCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const offeredPeersRef = useRef(new Set<string>())

  useEffect(() => {
    if (!roomCode) return
    setSession((prev) => ({ ...prev, roomCode }))
  }, [roomCode])

  useEffect(() => {
    localMediaRef.current = session.localMedia
  }, [session.localMedia])

  const setParticipantsFromPresence = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      participants: toRoomParticipants(
        roomUsersRef.current,
        roomId,
        memberByUidRef.current,
        firebaseUser?.uid,
        localStreamRef.current,
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

  const cleanupWebRtc = useCallback(() => {
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
  }, [])

  // ── Conectar Socket.IO + cargar historial al montar ───────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const token = await getIdToken()
        if (cancelled) return
        const roomMembersPromise = getRoomMembers(token, roomId).catch(() => [])
        const roomMembers = await roomMembersPromise
        if (cancelled) return
        memberByUidRef.current = new Map(roomMembers.map((member) => [member.uid, member]))

        if (!localStreamRef.current && navigator.mediaDevices?.getUserMedia) {
          try {
            localStreamRef.current = await navigator.mediaDevices.getUserMedia(
              createMediaConstraints(
                lobbyMediaPrefs?.selectedMicId,
                lobbyMediaPrefs?.selectedCameraId,
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
          const nextMicOn = hasAudio && (lobbyMediaPrefs?.isMicOn ?? true)
          const nextCameraOn = hasVideo && (lobbyMediaPrefs?.isCameraOn ?? true)
          localStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = nextMicOn
          })
          localStreamRef.current.getVideoTracks().forEach((track) => {
            track.enabled = nextCameraOn
          })
          localMediaRef.current = {
            ...localMediaRef.current,
            isMicOn: nextMicOn,
            isCameraOn: nextCameraOn,
          }

          setSession((prev) => ({
            ...prev,
            localMedia: {
              ...prev.localMedia,
              isMicOn: nextMicOn,
              isCameraOn: nextCameraOn,
            },
            participants: prev.participants.map((participant) =>
              participant.isLocal
                ? {
                    ...participant,
                    isMicOn: nextMicOn,
                    isCameraOn: nextCameraOn,
                    videoStream: localStreamRef.current,
                  }
                : participant,
            ),
          }))
        }

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

        socket.on(ROOM_SOCKET_EVENTS.ROOM_USERS, async (users: RoomUserPresencePayload[]) => {
          if (cancelled) return
          roomUsersRef.current = users
          const participants = toRoomParticipants(
            users,
            roomId,
            memberByUidRef.current,
            firebaseUser?.uid,
            localStreamRef.current,
            remoteStreamsRef.current,
          )

          setSession((prev) => ({
            ...prev,
            participants,
          }))
          emitMediaStatus({
            isMicOn: localStreamRef.current?.getAudioTracks().some((track) => track.enabled) ?? false,
            isCameraOn: localStreamRef.current?.getVideoTracks().some((track) => track.enabled) ?? false,
            isScreenSharing: localMediaRef.current.isScreenSharing,
          })
          syncPeerConnections(users).catch((err) => {
            console.error('[WebRTC] sync peers failed:', err)
          })
        })

        socket.on(ROOM_SOCKET_EVENTS.MEDIA_STATUS, (user: RoomUserPresencePayload) => {
          if (cancelled || user.roomId !== roomId) return

          roomUsersRef.current = roomUsersRef.current.map((roomUser) =>
            roomUser.socketId === user.socketId ? { ...roomUser, ...user } : roomUser,
          )

          setSession((prev) => ({
            ...prev,
            participants: prev.participants.map((participant) =>
              participant.socketId === user.socketId
                ? {
                    ...participant,
                    isCameraOn: !user.isVideoOff,
                    isMicOn: !user.isMuted,
                  }
                : participant,
            ),
          }))
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
    emitMediaStatus,
    firebaseUser?.uid,
    flushPendingIceCandidates,
    getIdToken,
    lobbyMediaPrefs,
    navigate,
    roomId,
    syncPeerConnections,
  ])

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
    const audioTracks = localStreamRef.current?.getAudioTracks() ?? []
    const nextMic = !session.localMedia.isMicOn
    audioTracks.forEach((track) => {
      track.enabled = nextMic
    })

    const nextMedia = { ...session.localMedia, isMicOn: nextMic }
    localMediaRef.current = nextMedia
    setSession((prev) => ({
      ...prev,
      localMedia: nextMedia,
      participants: prev.participants.map((p) =>
        p.isLocal ? { ...p, isMicOn: nextMic } : p,
      ),
    }))
    emitMediaStatus(nextMedia)
  }, [emitMediaStatus, session.localMedia])

  const toggleCamera = useCallback(() => {
    const videoTrack = cameraTrackRef.current
    const nextCam = !session.localMedia.isCameraOn
    if (videoTrack) {
      videoTrack.enabled = nextCam
    }
    if (!nextCam && screenTrackRef.current) {
      screenTrackRef.current.stop()
      screenTrackRef.current = null
      replaceOutgoingVideoTrack(null).catch((err) => {
        console.error('[WebRTC] stop video track failed:', err)
      })
    }

    const nextMedia = {
      ...session.localMedia,
      isCameraOn: nextCam,
      isScreenSharing: nextCam ? session.localMedia.isScreenSharing : false,
    }
    localMediaRef.current = nextMedia
    setSession((prev) => ({
      ...prev,
      localMedia: nextMedia,
      participants: prev.participants.map((p) =>
        p.isLocal ? { ...p, isCameraOn: nextCam } : p,
      ),
    }))
    emitMediaStatus(nextMedia)
  }, [emitMediaStatus, replaceOutgoingVideoTrack, session.localMedia])

  const toggleScreenShare = useCallback(async () => {
    if (session.localMedia.isScreenSharing) {
      screenTrackRef.current?.stop()
      screenTrackRef.current = null
      await replaceOutgoingVideoTrack(cameraTrackRef.current)

      const nextMedia = { ...session.localMedia, isScreenSharing: false }
      localMediaRef.current = nextMedia
      setSession((prev) => ({ ...prev, localMedia: nextMedia }))
      emitMediaStatus(nextMedia)
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) return

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const [screenTrack] = screenStream.getVideoTracks()
      if (!screenTrack) return

      screenTrackRef.current = screenTrack
      await replaceOutgoingVideoTrack(screenTrack)

      screenTrack.onended = () => {
        screenTrackRef.current = null
        replaceOutgoingVideoTrack(cameraTrackRef.current).catch((err) => {
          console.error('[WebRTC] restore camera track failed:', err)
        })
        setSession((prev) => {
          const nextMedia = { ...prev.localMedia, isScreenSharing: false }
          localMediaRef.current = nextMedia
          emitMediaStatus(nextMedia)
          return { ...prev, localMedia: nextMedia }
        })
      }

      const nextMedia = {
        ...session.localMedia,
        isScreenSharing: true,
        isCameraOn: true,
      }
      localMediaRef.current = nextMedia
      setSession((prev) => ({ ...prev, localMedia: nextMedia }))
      emitMediaStatus(nextMedia)
    } catch (err) {
      console.error('[WebRTC] screen share failed:', err)
    }
  }, [emitMediaStatus, replaceOutgoingVideoTrack, session.localMedia])

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
