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
import type { RoomReactionEmoji } from '../constants/roomReactions'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import { readLobbyMediaState, writeLobbyMediaState } from '../utils/lobbyMediaState'
import { createRoomAudioConstraints } from '../utils/roomMediaConstraints'
import { playSynthesizedSound } from '../utils/roomSounds'
import type {
  LeaveRoomOptions,
  LocalMediaState,
  LocalCaptionsState,
  RoomCaption,
  RoomChatMessage,
  RoomParticipant,
  RoomSessionActions,
  RoomSessionState,
} from '../types/roomSession'
import type { RoomMember } from '@/types/room'
import type { RoomReaction } from '../types/roomReaction'

interface UseRoomSessionResult {
  session: RoomSessionState
  actions: RoomSessionActions
  joinWarningMessage: string | null
  clearJoinWarning: () => void
  screenShareWarningMessage: string | null
  clearScreenShareWarning: () => void
  mediaError: 'permissions' | 'hardware' | 'webrtc' | null
  mediaPermissions: MediaPermissionSnapshot
  permissionWarnings: {
    microphone: boolean
    camera: boolean
  }
  refreshMediaPermissions: () => Promise<MediaPermissionSnapshot>
  requestDeviceAccess: (kind: 'microphone' | 'camera' | 'both') => Promise<boolean>
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

interface RoomCaptionClearPayload {
  roomId: string
  socketId: string
  uid: string | null
  username: string
  updatedAt: string
}

type LocalCaptionsWorkerMessage =
  | { type: 'status'; status: 'loading' | 'ready' | 'transcribing'; message?: string; model?: string }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }

interface SpeakingDetector {
  stream: MediaStream
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  data: Uint8Array
  intervalId: number
  isSpeaking: boolean
}

type SpeakingDetectorKind = 'camera' | 'screen'

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
  localScreenStream?: MediaStream | null,
  remoteStreams: Map<string, MediaStream> = new Map(),
  remoteScreenStreams: Map<string, MediaStream> = new Map(),
  localMedia?: LocalMediaState,
): RoomParticipant[] {
  return users
    .filter((user) => user.socketId.trim() && (!user.roomId || user.roomId === roomId))
    .map((user) => {
      const profile = resolveParticipantProfile(user, memberByUid)
      const isLocal = user.uid === localUserUid

      const isCameraOn = isLocal && localMedia ? localMedia.isCameraOn : !user.isVideoOff
      const isMicOn = isLocal && localMedia ? localMedia.isMicOn : !user.isMuted
      const isScreenSharing = isLocal && localMedia ? localMedia.isScreenSharing : Boolean(user.isScreenSharing)

      return {
        id: user.uid ?? user.socketId,
        socketId: user.socketId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        isLocal,
        isCameraOn,
        isMicOn,
        isScreenSharing,
        videoStream: isLocal
          ? (isCameraOn ? localStream ?? null : null)
          : remoteStreams.get(user.socketId) ?? null,
        screenStream: isLocal
          ? (isScreenSharing ? localScreenStream ?? null : null)
          : remoteScreenStreams.get(user.socketId) ?? null,
      }
    })
}

// playSynthesizedSound is now imported from '../utils/roomSounds'

const defaultIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
const PEER_DISCONNECTED_GRACE_MS = 8_000
const MAX_ICE_RESTART_ATTEMPTS_PER_PEER = 1
const LOCAL_CAPTIONS_MODELS = [
  'onnx-community/whisper-small',
  'onnx-community/whisper-base',
  'onnx-community/whisper-tiny',
]
const LOCAL_CAPTIONS_LANGUAGE = 'spanish'
const LOCAL_CAPTIONS_SAMPLE_RATE = 16_000
const LOCAL_CAPTIONS_CHUNK_SECONDS = 4
const LOCAL_CAPTIONS_MIN_SECONDS = 0.75
const LOCAL_CAPTIONS_SILENCE_MS = 650
const LOCAL_CAPTIONS_VOICE_THRESHOLD = 0.006
const LOCAL_CAPTIONS_CLEAR_MS = 5_000

type MediaPermissionSnapshot = {
  microphone?: PermissionState | 'unsupported'
  camera?: PermissionState | 'unsupported'
}

async function readMediaPermissionStates(): Promise<MediaPermissionSnapshot> {
  if (!navigator.permissions?.query) {
    return { microphone: 'unsupported', camera: 'unsupported' }
  }

  const readPermission = async (name: 'microphone' | 'camera') => {
    try {
      const status = await navigator.permissions.query({ name: name as PermissionName })
      return status.state
    } catch {
      return 'unsupported'
    }
  }

  const [microphone, camera] = await Promise.all([
    readPermission('microphone'),
    readPermission('camera'),
  ])

  return { microphone, camera }
}


function cleanIceServerValue(value: string): string {
  return value.trim().replace(/^["']+|["']+$/g, '')
}

function isTurnIceServerUrl(url: string): boolean {
  return /^turns?:/i.test(url)
}

function isLikelyMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(
      navigator.userAgent,
    ) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
  )
}

function getScreenShareUnavailableMessage(): string {
  return isLikelyMobileDevice()
    ? 'Tu navegador movil no permite compartir pantalla desde una pagina web. Si este dispositivo soporta captura de pantalla, prueba con la version mas reciente de Chrome/Edge; en iPhone/iPad normalmente se requiere una app nativa.'
    : 'Tu navegador no permite compartir pantalla en esta pagina. Verifica que estes usando HTTPS y un navegador compatible.'
}

function getScreenShareFailureMessage(err: unknown): string | null {
  const errorName = err instanceof DOMException ? err.name : undefined
  if (errorName === 'NotAllowedError' || errorName === 'AbortError') {
    return null
  }

  return isLikelyMobileDevice()
    ? 'No pudimos iniciar la captura de pantalla en este celular. El navegador puede bloquear esta funcion aunque la camara siga funcionando.'
    : 'No pudimos iniciar la captura de pantalla. Revisa los permisos del navegador e intentalo de nuevo.'
}

function isPermissionDeniedMediaError(err: unknown): boolean {
  const name = err instanceof DOMException ? err.name : (err as { name?: string })?.name
  return name === 'NotAllowedError' || name === 'PermissionDeniedError'
}

function getPeerConnectionConfig(): RTCConfiguration {
  const configuredUrls = (import.meta.env.VITE_TURN_URL as string | undefined)
    ?.split(',')
    .map(cleanIceServerValue)
    .filter(Boolean)

  if (!configuredUrls?.length) {
    return {
      iceServers: defaultIceServers,
      bundlePolicy: 'max-bundle',
    }
  }

  const username = cleanIceServerValue(
    (import.meta.env.VITE_TURN_USERNAME as string | undefined) ?? '',
  )
  const credential = cleanIceServerValue(
    (import.meta.env.VITE_TURN_CREDENTIAL as string | undefined) ?? '',
  )
  const turnUrls = configuredUrls.filter(isTurnIceServerUrl)
  const nonTurnUrls = configuredUrls.filter((url) => !isTurnIceServerUrl(url))
  const iceServers: RTCIceServer[] = [...defaultIceServers]

  if (nonTurnUrls.length > 0) {
    iceServers.push({ urls: nonTurnUrls })
  }

  if (turnUrls.length > 0) {
    if (username && credential) {
      iceServers.push({ urls: turnUrls, username, credential })
    } else {
      console.warn(
        '[WebRTC] TURN server ignored because VITE_TURN_USERNAME and VITE_TURN_CREDENTIAL are required for turn/turns URLs.',
      )
    }
  }

  return {
    iceServers,
    bundlePolicy: 'max-bundle',
  }
}

function calculateRms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

function downsampleAudio(input: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === LOCAL_CAPTIONS_SAMPLE_RATE) return input

  const ratio = inputSampleRate / LOCAL_CAPTIONS_SAMPLE_RATE
  const outputLength = Math.floor(input.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), input.length)
    let sum = 0
    for (let j = start; j < end; j++) {
      sum += input[j]
    }
    output[i] = sum / Math.max(1, end - start)
  }

  return output
}

function mergeAudioChunks(chunks: Float32Array[], totalSamples: number): Float32Array {
  const merged = new Float32Array(totalSamples)
  let offset = 0

  chunks.forEach((chunk) => {
    merged.set(chunk, offset)
    offset += chunk.length
  })

  return merged
}

function canProcessLocalCaptions(status: LocalCaptionsState['status']): boolean {
  return status === 'active' || status === 'transcribing'
}

function createCameraConstraints(
  selectedCameraId?: string,
  facingMode: 'user' | 'environment' = 'user',
): MediaTrackConstraints {
  return {
    ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode }),
    width: { ideal: 1280 },
    height: { ideal: 720 },
    aspectRatio: { ideal: 1.7777777778 },
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
    captions: [],
    reactions: [],
    localCaptions: {
      enabled: false,
      status: 'idle',
      error: null,
      model: null,
    },
    loadingHistory: false,
    hasMoreHistory: false,
  }))
  const [joinWarningMessage, setJoinWarningMessage] = useState<string | null>(null)
  const [screenShareWarningMessage, setScreenShareWarningMessage] = useState<string | null>(null)
  const [mediaError, setMediaError] = useState<'permissions' | 'hardware' | 'webrtc' | null>(null)
  const [mediaPermissions, setMediaPermissions] = useState<MediaPermissionSnapshot>({
    microphone: 'unsupported',
    camera: 'unsupported',
  })
  const [retryCount, setRetryCount] = useState(0)
  const [peerFailureRevision, setPeerFailureRevision] = useState(0)

  const nextCursorRef = useRef<string | null>(null)
  const loadingHistoryRef = useRef(false)
  const mediaErrorRef = useRef<'permissions' | 'hardware' | 'webrtc' | null>(null)
  const memberByUidRef = useRef(new Map<string, RoomMember>())
  const roomUsersRef = useRef<RoomUserPresencePayload[]>([])
  const localMediaRef = useRef<LocalMediaState>(initialMedia)
  const cameraFacingModeRef = useRef<'user' | 'environment'>('user')
  const localStreamRef = useRef<MediaStream | null>(null)
  const localScreenStreamRef = useRef<MediaStream | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenAudioTrackRef = useRef<MediaStreamTrack | null>(null)
  const peerConnectionsRef = useRef(new Map<string, RTCPeerConnection>())
  const remoteStreamsRef = useRef(new Map<string, MediaStream>())
  const remoteScreenStreamsRef = useRef(new Map<string, MediaStream>())
  const remoteCameraStreamIdsRef = useRef(new Map<string, string>())
  const remoteScreenStreamIdsRef = useRef(new Map<string, string>())
  const pendingIceCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const offeredPeersRef = useRef(new Set<string>())
  const peerRecoveryTimeoutsRef = useRef(new Map<string, number>())
  const peerIceRestartAttemptsRef = useRef(new Map<string, number>())
  const peerConnectedOnceRef = useRef(new Set<string>())
  const localHadAnyPeerConnectionRef = useRef(false)
  const isolatedPeerFailuresRef = useRef(new Set<string>())
  const audioContextRef = useRef<AudioContext | null>(null)
  const speakingDetectorsRef = useRef(new Map<string, SpeakingDetector>())
  const reactionTimeoutsRef = useRef(new Map<string, number>())
  const captionClearTimeoutsRef = useRef(new Map<string, number>())
  const localCaptionsStateRef = useRef<LocalCaptionsState>({ enabled: false, status: 'idle', error: null, model: null })
  const localCaptionsWorkerRef = useRef<Worker | null>(null)
  const localCaptionsAudioContextRef = useRef<AudioContext | null>(null)
  const localCaptionsSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const localCaptionsProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const localCaptionsChunksRef = useRef<Float32Array[]>([])
  const localCaptionsSampleCountRef = useRef(0)
  const localCaptionsSilenceMsRef = useRef(0)
  const localCaptionsBusyRef = useRef(false)
  const localCaptionsLastTextRef = useRef('')

  const receiveReaction = useCallback((reaction: RoomReaction) => {
    if (reaction.roomId !== roomId) return

    setSession((prev) => ({
      ...prev,
      reactions: [
        ...prev.reactions.filter((item) => item.id !== reaction.id),
        reaction,
      ].slice(-24),
    }))

    const existingTimeout = reactionTimeoutsRef.current.get(reaction.id)
    if (existingTimeout) window.clearTimeout(existingTimeout)

    const timeoutId = window.setTimeout(() => {
      setSession((prev) => ({
        ...prev,
        reactions: prev.reactions.filter((item) => item.id !== reaction.id),
      }))
      reactionTimeoutsRef.current.delete(reaction.id)
    }, 3600)

    reactionTimeoutsRef.current.set(reaction.id, timeoutId)
  }, [roomId])

  const setLocalCaptionsState = useCallback((next: LocalCaptionsState) => {
    localCaptionsStateRef.current = next
    setSession((prev) => ({
      ...prev,
      localCaptions: next,
    }))
  }, [])

  const clearCaptionForSocket = useCallback((socketId: string) => {
    const timeout = captionClearTimeoutsRef.current.get(socketId)
    if (timeout) {
      window.clearTimeout(timeout)
      captionClearTimeoutsRef.current.delete(socketId)
    }

    setSession((prev) => ({
      ...prev,
      captions: prev.captions.filter((caption) => caption.socketId !== socketId),
    }))
  }, [])

  const scheduleCaptionClear = useCallback((socketId: string) => {
    const existingTimeout = captionClearTimeoutsRef.current.get(socketId)
    if (existingTimeout) window.clearTimeout(existingTimeout)

    const timeoutId = window.setTimeout(() => {
      clearCaptionForSocket(socketId)
    }, LOCAL_CAPTIONS_CLEAR_MS)

    captionClearTimeoutsRef.current.set(socketId, timeoutId)
  }, [clearCaptionForSocket])

  const receiveCaption = useCallback((caption: RoomCaption) => {
    if (caption.roomId !== roomId) return

    setSession((prev) => ({
      ...prev,
      captions: [
        ...prev.captions.filter((item) => item.socketId !== caption.socketId),
        caption,
      ].slice(-12),
    }))
    scheduleCaptionClear(caption.socketId)
  }, [roomId, scheduleCaptionClear])

  const receiveCaptionClear = useCallback((payload: RoomCaptionClearPayload) => {
    if (payload.roomId !== roomId) return
    clearCaptionForSocket(payload.socketId)
  }, [clearCaptionForSocket, roomId])

  const closeSpeakingDetector = useCallback((socketId: string) => {
    const detector = speakingDetectorsRef.current.get(socketId)
    if (!detector) return

    window.clearInterval(detector.intervalId)
    detector.source.disconnect()
    speakingDetectorsRef.current.delete(socketId)
  }, [])

  const syncSpeakingDetectors = useCallback((participants: RoomParticipant[]) => {
    const getDetectorKey = (socketId: string, kind: SpeakingDetectorKind) =>
      `${socketId}:${kind}`

    const liveDetectorKeys = new Set<string>()
    participants.forEach((participant) => {
      liveDetectorKeys.add(getDetectorKey(participant.socketId, 'camera'))
      liveDetectorKeys.add(getDetectorKey(participant.socketId, 'screen'))
    })

    speakingDetectorsRef.current.forEach((_, detectorKey) => {
      if (!liveDetectorKeys.has(detectorKey)) {
        closeSpeakingDetector(detectorKey)
      }
    })

    const syncDetectorForStream = (
      participant: RoomParticipant,
      kind: SpeakingDetectorKind,
      stream: MediaStream | null | undefined,
    ) => {
      const detectorKey = getDetectorKey(participant.socketId, kind)

      const hasLiveAudio = stream?.getAudioTracks().some(
        (track) => track.readyState === 'live',
      )

      if (!stream || !hasLiveAudio) {
        closeSpeakingDetector(detectorKey)
        const isCurrentlyMarkedSpeaking =
          kind === 'screen' ? participant.isScreenSpeaking : participant.isSpeaking
        if (isCurrentlyMarkedSpeaking) {
          setSession((prev) => ({
            ...prev,
            participants: prev.participants.map((item) =>
              item.socketId === participant.socketId
                ? {
                    ...item,
                    ...(kind === 'screen'
                      ? { isScreenSpeaking: false }
                      : { isSpeaking: false }),
                  }
                : item,
            ),
          }))
        }
        return
      }

      const existing = speakingDetectorsRef.current.get(detectorKey)
      if (existing?.stream === stream) return

      closeSpeakingDetector(detectorKey)

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

      let silenceTicks = 0
      const HANGOVER_TICKS = 5 // 5 ticks * 80ms = 400ms of silence required to turn off

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
                item.socketId === participant.socketId
                  ? {
                      ...item,
                      ...(kind === 'screen'
                        ? { isScreenSpeaking: false }
                        : { isSpeaking: false }),
                    }
                  : item,
              ),
            }))
          }
          return
        }

        analyser.getByteTimeDomainData(data)
        const averageVolume =
          data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length
        
        // Threshold set to 4 (balanced sensitivity)
        const isCurrentlyLoud = averageVolume > 4

        let nextSpeaking = detector.isSpeaking
        if (isCurrentlyLoud) {
          silenceTicks = 0
          nextSpeaking = true
        } else {
          silenceTicks++
          if (silenceTicks >= HANGOVER_TICKS) {
            nextSpeaking = false
          }
        }

        if (nextSpeaking === detector.isSpeaking) return

        detector.isSpeaking = nextSpeaking
        setSession((prev) => ({
          ...prev,
          participants: prev.participants.map((item) =>
            item.socketId === participant.socketId
              ? {
                  ...item,
                  ...(kind === 'screen'
                    ? { isScreenSpeaking: nextSpeaking }
                    : { isSpeaking: nextSpeaking }),
                }
              : item,
          ),
        }))
      }, 80)

      speakingDetectorsRef.current.set(detectorKey, detector)
    }

    participants.forEach((participant) => {
      const cameraStream = participant.isLocal
        ? localStreamRef.current
        : remoteStreamsRef.current.get(participant.socketId)
      const screenStream = participant.isLocal
        ? localScreenStreamRef.current
        : remoteScreenStreamsRef.current.get(participant.socketId)

      syncDetectorForStream(participant, 'camera', cameraStream)
      syncDetectorForStream(participant, 'screen', screenStream)
    })
  }, [closeSpeakingDetector])

  const emitCaptionClear = useCallback(() => {
    const socket = getSocket()
    const localSocketId = socket?.id ?? roomUsersRef.current.find((user) => user.uid === firebaseUser?.uid)?.socketId
    if (localSocketId) {
      clearCaptionForSocket(localSocketId)
    }
    if (socket?.connected) {
      socket.emit(ROOM_SOCKET_EVENTS.CAPTION_CLEAR, { roomId })
    }
  }, [clearCaptionForSocket, firebaseUser?.uid, roomId])

  const emitCaptionUpdate = useCallback((text: string) => {
    const socket = getSocket()
    const localSocketId = socket?.id ?? roomUsersRef.current.find((user) => user.uid === firebaseUser?.uid)?.socketId
    if (localSocketId) {
      receiveCaption({
        roomId,
        socketId: localSocketId,
        uid: firebaseUser?.uid ?? null,
        username: localUser.displayName,
        text,
        isFinal: true,
        updatedAt: new Date().toISOString(),
      })
    }
    if (!socket?.connected) return

    socket.emit(ROOM_SOCKET_EVENTS.CAPTION_UPDATE, {
      roomId,
      text,
      isFinal: true,
    })
  }, [firebaseUser?.uid, localUser.displayName, receiveCaption, roomId])

  const resetLocalCaptionBuffers = useCallback(() => {
    localCaptionsChunksRef.current = []
    localCaptionsSampleCountRef.current = 0
    localCaptionsSilenceMsRef.current = 0
  }, [])

  const flushLocalCaptionAudio = useCallback(() => {
    if (!canProcessLocalCaptions(localCaptionsStateRef.current.status)) return
    if (localCaptionsBusyRef.current) return
    if (localCaptionsSampleCountRef.current < LOCAL_CAPTIONS_MIN_SECONDS * LOCAL_CAPTIONS_SAMPLE_RATE) {
      resetLocalCaptionBuffers()
      return
    }

    const worker = localCaptionsWorkerRef.current
    if (!worker) return

    const audio = mergeAudioChunks(
      localCaptionsChunksRef.current,
      localCaptionsSampleCountRef.current,
    )
    resetLocalCaptionBuffers()
    localCaptionsBusyRef.current = true
    worker.postMessage({ type: 'transcribe', audio }, [audio.buffer])
  }, [resetLocalCaptionBuffers])

  const stopLocalCaptions = useCallback((options?: { emitClear?: boolean }) => {
    localCaptionsProcessorRef.current?.disconnect()
    localCaptionsSourceRef.current?.disconnect()
    localCaptionsAudioContextRef.current?.close().catch(() => undefined)
    localCaptionsWorkerRef.current?.postMessage({ type: 'dispose' })
    localCaptionsWorkerRef.current?.terminate()

    localCaptionsProcessorRef.current = null
    localCaptionsSourceRef.current = null
    localCaptionsAudioContextRef.current = null
    localCaptionsWorkerRef.current = null
    localCaptionsBusyRef.current = false
    localCaptionsLastTextRef.current = ''
    resetLocalCaptionBuffers()

    if (options?.emitClear ?? true) {
      emitCaptionClear()
    }

    setLocalCaptionsState({ enabled: false, status: 'idle', error: null, model: null })
  }, [emitCaptionClear, resetLocalCaptionBuffers, setLocalCaptionsState])

  const startLocalCaptions = useCallback(async () => {
    if (localCaptionsStateRef.current.enabled) return

    const audioTrack = localStreamRef.current?.getAudioTracks()[0]
    if (
      !audioTrack ||
      audioTrack.readyState !== 'live' ||
      !audioTrack.enabled ||
      !localMediaRef.current.isMicOn
    ) {
      setLocalCaptionsState({
        enabled: false,
        status: 'error',
        error: 'Activa el microfono para generar subtitulos locales.',
        model: null,
      })
      return
    }

    if (!window.AudioContext || typeof Worker === 'undefined') {
      setLocalCaptionsState({
        enabled: false,
        status: 'unsupported',
        error: 'Este navegador no soporta subtitulos locales.',
        model: null,
      })
      return
    }

    try {
      setLocalCaptionsState({ enabled: true, status: 'loading', error: null, model: null })
      resetLocalCaptionBuffers()

      const worker = new Worker(
        new URL('../workers/localCaptions.worker.ts', import.meta.url),
        { type: 'module' },
      )
      localCaptionsWorkerRef.current = worker

      worker.onmessage = (event: MessageEvent<LocalCaptionsWorkerMessage>) => {
        const message = event.data
        if (message.type === 'status') {
          const current = localCaptionsStateRef.current
          setLocalCaptionsState({
            enabled: current.enabled,
            status: message.status === 'ready' ? 'active' : message.status,
            error: message.message ?? null,
            model: message.model ?? current.model,
          })
          return
        }

        if (message.type === 'result') {
          localCaptionsBusyRef.current = false
          const text = message.text.trim()
          if (text && text !== localCaptionsLastTextRef.current) {
            localCaptionsLastTextRef.current = text
            emitCaptionUpdate(text)
          }
          return
        }

        if (message.type === 'error') {
          console.error('[Captions] local worker error:', message.message)
          localCaptionsBusyRef.current = false
          stopLocalCaptions({ emitClear: false })
          setLocalCaptionsState({
            enabled: false,
            status: 'error',
            error: message.message,
            model: null,
          })
        }
      }

      worker.onerror = (event) => {
        event.preventDefault()
        console.error('[Captions] local worker crashed')
        localCaptionsBusyRef.current = false
        stopLocalCaptions({ emitClear: false })
        setLocalCaptionsState({
          enabled: false,
          status: 'error',
          error: 'No se pudo iniciar el transcriptor local.',
          model: null,
        })
      }

      worker.onmessageerror = (event) => {
        event.preventDefault()
        console.error('[Captions] local worker message error')
        localCaptionsBusyRef.current = false
        stopLocalCaptions({ emitClear: false })
        setLocalCaptionsState({
          enabled: false,
          status: 'error',
          error: 'No se pudo comunicar con el transcriptor local.',
          model: null,
        })
      }

      worker.postMessage({
        type: 'init',
        models: LOCAL_CAPTIONS_MODELS,
        language: LOCAL_CAPTIONS_LANGUAGE,
      })

      const audioContext = new AudioContext()
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const audioStream = new MediaStream([audioTrack])
      const source = audioContext.createMediaStreamSource(audioStream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)

      processor.onaudioprocess = (event) => {
        const input = event.inputBuffer.getChannelData(0)
        event.outputBuffer.getChannelData(0).fill(0)
        const captionsState = localCaptionsStateRef.current

        if (
          !captionsState.enabled ||
          !canProcessLocalCaptions(captionsState.status) ||
          !localMediaRef.current.isMicOn
        ) {
          resetLocalCaptionBuffers()
          return
        }

        const rms = calculateRms(input)
        const isVoiceActive = rms >= LOCAL_CAPTIONS_VOICE_THRESHOLD

        if (isVoiceActive) {
          const downsampled = downsampleAudio(input, audioContext.sampleRate)
          localCaptionsChunksRef.current.push(downsampled)
          localCaptionsSampleCountRef.current += downsampled.length
          localCaptionsSilenceMsRef.current = 0
        } else if (localCaptionsSampleCountRef.current > 0) {
          localCaptionsSilenceMsRef.current += (input.length / audioContext.sampleRate) * 1000
        }

        const reachedChunkLimit =
          localCaptionsSampleCountRef.current >= LOCAL_CAPTIONS_CHUNK_SECONDS * LOCAL_CAPTIONS_SAMPLE_RATE
        const reachedSilence =
          localCaptionsSilenceMsRef.current >= LOCAL_CAPTIONS_SILENCE_MS

        if (reachedChunkLimit || reachedSilence) {
          flushLocalCaptionAudio()
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      localCaptionsAudioContextRef.current = audioContext
      localCaptionsSourceRef.current = source
      localCaptionsProcessorRef.current = processor
    } catch (error) {
      console.error('[Captions] local captions failed:', error)
      stopLocalCaptions({ emitClear: false })
      setLocalCaptionsState({
        enabled: false,
        status: 'error',
        error: 'No se pudieron activar los subtitulos locales.',
        model: null,
      })
    }
  }, [
    emitCaptionUpdate,
    flushLocalCaptionAudio,
    resetLocalCaptionBuffers,
    setLocalCaptionsState,
    stopLocalCaptions,
  ])

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

  useEffect(() => {
    mediaErrorRef.current = mediaError
  }, [mediaError])

  const refreshMediaPermissions = useCallback(async () => {
    const snapshot = await readMediaPermissionStates()
    setMediaPermissions(snapshot)
    return snapshot
  }, [])

  const setParticipantsFromPresence = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      participants: toRoomParticipants(
        roomUsersRef.current,
        roomId,
        memberByUidRef.current,
        firebaseUser?.uid,
        localMediaRef.current.isCameraOn ? localStreamRef.current : null,
        localMediaRef.current.isScreenSharing ? localScreenStreamRef.current : null,
        remoteStreamsRef.current,
        remoteScreenStreamsRef.current,
        localMediaRef.current,
      ),
    }))
  }, [firebaseUser?.uid, roomId])

  const emitMediaStatus = useCallback((media: LocalMediaState) => {
    void (async () => {
      const socket = getSocket()
      if (!socket?.connected) return

      const audioTrack = localStreamRef.current?.getAudioTracks()[0] ?? null
      const videoTrack = localStreamRef.current?.getVideoTracks()[0] ?? null
      const mediaPermissions = await readMediaPermissionStates()
      if (!socket.connected) return

      socket.emit(ROOM_SOCKET_EVENTS.MEDIA_STATUS, {
        roomId,
        isMuted: !media.isMicOn,
        isVideoOff: !media.isCameraOn,
        isScreenSharing: media.isScreenSharing,
        hasAudioTrack: Boolean(audioTrack),
        hasVideoTrack: Boolean(videoTrack),
        audioTrackEnabled: audioTrack?.enabled ?? false,
        videoTrackEnabled: videoTrack?.enabled ?? false,
        audioTrackReadyState: audioTrack?.readyState ?? null,
        videoTrackReadyState: videoTrack?.readyState ?? null,
        mediaPermissions,
        mediaError: mediaErrorRef.current,
      })
    })()
  }, [roomId])

  const emitJoinRoom = useCallback(() => {
    const socket = getSocket()
    if (!socket?.connected) return

    socket.emit(ROOM_SOCKET_EVENTS.NEW_USER)
    socket.emit(ROOM_SOCKET_EVENTS.JOIN_ROOM, {
      roomId,
      isMuted: !localMediaRef.current.isMicOn,
      isVideoOff: !localMediaRef.current.isCameraOn,
    })
  }, [roomId])

  const clearPeerRecoveryTimeout = useCallback((remoteSocketId: string) => {
    const timeoutId = peerRecoveryTimeoutsRef.current.get(remoteSocketId)
    if (!timeoutId) return

    window.clearTimeout(timeoutId)
    peerRecoveryTimeoutsRef.current.delete(remoteSocketId)
  }, [])

  const markIsolatedPeerFailure = useCallback((remoteSocketId: string) => {
    isolatedPeerFailuresRef.current.add(remoteSocketId)
    setPeerFailureRevision((revision) => revision + 1)
  }, [])

  const closePeerConnection = useCallback((
    remoteSocketId: string,
    options: { preserveFailure?: boolean } = {},
  ) => {
    clearPeerRecoveryTimeout(remoteSocketId)
    peerConnectionsRef.current.get(remoteSocketId)?.close()
    peerConnectionsRef.current.delete(remoteSocketId)
    remoteStreamsRef.current.delete(remoteSocketId)
    remoteScreenStreamsRef.current.delete(remoteSocketId)
    remoteCameraStreamIdsRef.current.delete(remoteSocketId)
    remoteScreenStreamIdsRef.current.delete(remoteSocketId)
    pendingIceCandidatesRef.current.delete(remoteSocketId)
    offeredPeersRef.current.delete(remoteSocketId)
    peerIceRestartAttemptsRef.current.delete(remoteSocketId)
    peerConnectedOnceRef.current.delete(remoteSocketId)
    if (!options.preserveFailure) {
      isolatedPeerFailuresRef.current.delete(remoteSocketId)
    }
    setParticipantsFromPresence()
  }, [clearPeerRecoveryTimeout, setParticipantsFromPresence])

  const restartPeerIce = useCallback(async (
    remoteSocketId: string,
    pc: RTCPeerConnection,
  ) => {
    const socket = getSocket()
    if (!socket?.connected || pc.signalingState !== 'stable') return false

    try {
      pc.restartIce()
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      socket.emit(ROOM_SOCKET_EVENTS.WEBRTC_OFFER, {
        roomId,
        toSocketId: remoteSocketId,
        offer,
      })
      return true
    } catch (err) {
      console.error(`[WebRTC] ICE restart failed for ${remoteSocketId}:`, err)
      return false
    }
  }, [roomId])

  const flushPendingIceCandidates = useCallback(async (remoteSocketId: string) => {
    const pc = peerConnectionsRef.current.get(remoteSocketId)
    const pending = pendingIceCandidatesRef.current.get(remoteSocketId)
    if (!pc || !pending?.length || !pc.remoteDescription) return

    console.log(`[WebRTC] Flushing ${pending.length} pending ice candidates for: ${remoteSocketId}`)
    pendingIceCandidatesRef.current.delete(remoteSocketId)
    await Promise.all(
      pending.map(async (candidate) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (err) {
          console.error(`[WebRTC] Failed to add flushed ice candidate for ${remoteSocketId}:`, err)
        }
      }),
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

    if (localScreenStreamRef.current) {
      console.log(`[WebRTC] Adding local screen tracks to new peer connection for ${remoteSocketId}`)
      localScreenStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localScreenStreamRef.current!)
      })
    }

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
      console.log(`[WebRTC] ontrack event fired for peer: ${remoteSocketId}. Track kind: ${event.track.kind}`)
      const remoteStream = event.streams[0]
      if (!remoteStream) return

      if (event.track.kind === 'audio') {
        const cameraStreamId = remoteCameraStreamIdsRef.current.get(remoteSocketId)
        const screenStreamId = remoteScreenStreamIdsRef.current.get(remoteSocketId)
        const isScreenAudio =
          remoteStream.id === screenStreamId ||
          (Boolean(cameraStreamId) && remoteStream.id !== cameraStreamId)

        if (isScreenAudio) {
          remoteScreenStreamIdsRef.current.set(remoteSocketId, remoteStream.id)
          let existingScreenStream = remoteScreenStreamsRef.current.get(remoteSocketId)
          if (!existingScreenStream) {
            existingScreenStream = new MediaStream()
            remoteScreenStreamsRef.current.set(remoteSocketId, existingScreenStream)
          }
          existingScreenStream.getAudioTracks().forEach((track) => {
            existingScreenStream!.removeTrack(track)
          })
          existingScreenStream.addTrack(event.track)
        } else {
          remoteCameraStreamIdsRef.current.set(remoteSocketId, remoteStream.id)
          let existingCameraStream = remoteStreamsRef.current.get(remoteSocketId)
          if (!existingCameraStream) {
            existingCameraStream = new MediaStream()
            remoteStreamsRef.current.set(remoteSocketId, existingCameraStream)
          }
          existingCameraStream.getAudioTracks().forEach((track) => {
            existingCameraStream!.removeTrack(track)
          })
          existingCameraStream.addTrack(event.track)
        }
        setParticipantsFromPresence()
      } else if (event.track.kind === 'video') {
        let cameraStreamId = remoteCameraStreamIdsRef.current.get(remoteSocketId)
        if (!cameraStreamId) {
          cameraStreamId = remoteStream.id
          remoteCameraStreamIdsRef.current.set(remoteSocketId, cameraStreamId)
        }

        if (remoteStream.id === cameraStreamId) {
          let existingCameraStream = remoteStreamsRef.current.get(remoteSocketId)
          if (!existingCameraStream) {
            existingCameraStream = new MediaStream()
            remoteStreamsRef.current.set(remoteSocketId, existingCameraStream)
          }
          existingCameraStream.getVideoTracks().forEach((t) => existingCameraStream!.removeTrack(t))
          existingCameraStream.addTrack(event.track)
        } else {
          remoteScreenStreamIdsRef.current.set(remoteSocketId, remoteStream.id)
          let existingScreenStream = remoteScreenStreamsRef.current.get(remoteSocketId)
          if (!existingScreenStream) {
            existingScreenStream = new MediaStream()
            remoteScreenStreamsRef.current.set(remoteSocketId, existingScreenStream)
            playSynthesizedSound('screen-share')
          }
          existingScreenStream.getVideoTracks().forEach((t) => existingScreenStream!.removeTrack(t))
          existingScreenStream.addTrack(event.track)
        }
        setParticipantsFromPresence()
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state change for ${remoteSocketId}: ${pc.connectionState}`)
      if (pc.connectionState === 'connected') {
        clearPeerRecoveryTimeout(remoteSocketId)
        peerIceRestartAttemptsRef.current.delete(remoteSocketId)
        peerConnectedOnceRef.current.add(remoteSocketId)
        localHadAnyPeerConnectionRef.current = true
        isolatedPeerFailuresRef.current.delete(remoteSocketId)
        if (mediaErrorRef.current === 'webrtc') {
          setMediaError(null)
        }
        return
      }

      if (pc.connectionState === 'disconnected') {
        if (!peerRecoveryTimeoutsRef.current.has(remoteSocketId)) {
          const timeoutId = window.setTimeout(() => {
            peerRecoveryTimeoutsRef.current.delete(remoteSocketId)
            if (pc.connectionState !== 'disconnected') return

            const attempts = peerIceRestartAttemptsRef.current.get(remoteSocketId) ?? 0
            if (attempts < MAX_ICE_RESTART_ATTEMPTS_PER_PEER) {
              peerIceRestartAttemptsRef.current.set(remoteSocketId, attempts + 1)
              restartPeerIce(remoteSocketId, pc).catch(() => undefined)
              return
            }

            markIsolatedPeerFailure(remoteSocketId)
            closePeerConnection(remoteSocketId, { preserveFailure: true })
          }, PEER_DISCONNECTED_GRACE_MS)
          peerRecoveryTimeoutsRef.current.set(remoteSocketId, timeoutId)
        }
        return
      }

      if (pc.connectionState === 'failed') {
        clearPeerRecoveryTimeout(remoteSocketId)
        const attempts = peerIceRestartAttemptsRef.current.get(remoteSocketId) ?? 0
        if (attempts < MAX_ICE_RESTART_ATTEMPTS_PER_PEER) {
          peerIceRestartAttemptsRef.current.set(remoteSocketId, attempts + 1)
          restartPeerIce(remoteSocketId, pc).catch(() => undefined)
          return
        }

        markIsolatedPeerFailure(remoteSocketId)
        closePeerConnection(remoteSocketId, { preserveFailure: true })
        return
      }

      if (pc.connectionState === 'closed') {
        closePeerConnection(remoteSocketId)
      }
    }

    return pc
  }, [
    clearPeerRecoveryTimeout,
    closePeerConnection,
    markIsolatedPeerFailure,
    restartPeerIce,
    roomId,
    setParticipantsFromPresence,
  ])

  const syncPeerConnections = useCallback(async (users: RoomUserPresencePayload[]) => {
    const socket = getSocket()
    const localSocketId = socket?.id
    if (!socket?.connected || !localSocketId) return

    const remoteSocketIds = users
      .map((user) => user.socketId)
      .filter((socketId) => socketId && socketId !== localSocketId)
    const connectableRemoteSocketIds = remoteSocketIds.filter(
      (socketId) => !isolatedPeerFailuresRef.current.has(socketId),
    )

    peerConnectionsRef.current.forEach((_, socketId) => {
      if (!remoteSocketIds.includes(socketId)) {
        closePeerConnection(socketId)
      }
    })

    await Promise.all(connectableRemoteSocketIds.map(async (remoteSocketId) => {
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
    console.log('[WebRTC] replaceOutgoingVideoTrack called with track:', track ? `${track.kind} (${track.id})` : 'null')
    await Promise.all(
      Array.from(peerConnectionsRef.current.entries()).map(async ([remoteSocketId, pc]) => {
        const transceiver = pc.getTransceivers().find(
          (t) => t.receiver.track.kind === 'video' || t.sender.track?.kind === 'video'
        )
        const sender = transceiver?.sender
        if (sender) {
          console.log(`[WebRTC] Found existing video sender for peer ${remoteSocketId}. Replacing track...`)
          await sender.replaceTrack(track)
          if (track && localStreamRef.current) {
            if (typeof sender.setStreams === 'function') {
              try {
                console.log(`[WebRTC] Associating local stream with video sender for peer ${remoteSocketId}`)
                sender.setStreams(localStreamRef.current)
              } catch (err) {
                console.warn('[WebRTC] sender.setStreams failed:', err)
              }
            }
          }
          console.log(`[WebRTC] Track replaced. Previous direction was: ${transceiver.direction}`)
          if (track) {
            if (transceiver.direction === 'recvonly') {
              console.log(`[WebRTC] Changing direction from recvonly to sendrecv for peer ${remoteSocketId}`)
              transceiver.direction = 'sendrecv'
            } else if (transceiver.direction === 'inactive') {
              console.log(`[WebRTC] Changing direction from inactive to sendonly for peer ${remoteSocketId}`)
              transceiver.direction = 'sendonly'
            }
          } else {
            if (transceiver.direction === 'sendrecv') {
              console.log(`[WebRTC] Changing direction from sendrecv to recvonly for peer ${remoteSocketId}`)
              transceiver.direction = 'recvonly'
            } else if (transceiver.direction === 'sendonly') {
              console.log(`[WebRTC] Changing direction from sendonly to inactive for peer ${remoteSocketId}`)
              transceiver.direction = 'inactive'
            }
          }
        } else if (track && localStreamRef.current) {
          console.log(`[WebRTC] Video sender not found for peer ${remoteSocketId}. Adding track...`)
          pc.addTrack(track, localStreamRef.current)
        }
      }),
    )
  }, [])

  const replaceOutgoingAudioTrack = useCallback(async (track: MediaStreamTrack | null) => {
    await Promise.all(
      Array.from(peerConnectionsRef.current.entries()).map(async ([remoteSocketId, pc]) => {
        const transceiver = pc.getTransceivers().find(
          (t) => t.receiver.track.kind === 'audio' || t.sender.track?.kind === 'audio'
        )
        const sender = transceiver?.sender
        if (sender) {
          await sender.replaceTrack(track)
          if (track && localStreamRef.current && typeof sender.setStreams === 'function') {
            try {
              sender.setStreams(localStreamRef.current)
            } catch (err) {
              console.warn('[WebRTC] sender.setStreams failed for audio:', err)
            }
          }
          if (track) {
            if (transceiver.direction === 'recvonly') {
              transceiver.direction = 'sendrecv'
            } else if (transceiver.direction === 'inactive') {
              transceiver.direction = 'sendonly'
            }
          } else if (transceiver.direction === 'sendrecv') {
            transceiver.direction = 'recvonly'
          } else if (transceiver.direction === 'sendonly') {
            transceiver.direction = 'inactive'
          }
        } else if (track && localStreamRef.current) {
          console.log(`[WebRTC] Audio sender not found for peer ${remoteSocketId}. Adding track...`)
          pc.addTrack(track, localStreamRef.current)
        }
      }),
    )
  }, [])

  const setupNegotiationHandler = useCallback((remoteSocketId: string, pc: RTCPeerConnection) => {
    console.log(`[WebRTC] setupNegotiationHandler registered for peer: ${remoteSocketId}`)
    pc.onnegotiationneeded = async () => {
      console.log(`[WebRTC] onnegotiationneeded event fired for peer: ${remoteSocketId}. signalingState: ${pc.signalingState}`)
      try {
        if (pc.signalingState !== 'stable') {
          console.log(`[WebRTC] signalingState is not stable (${pc.signalingState}), skipping offer creation.`)
          return
        }
        const socket = getSocket()
        if (!socket?.connected) {
          console.error('[WebRTC] Socket disconnected, cannot emit offer.')
          return
        }

        console.log(`[WebRTC] Creating renegotiation offer for peer: ${remoteSocketId}`)
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        console.log(`[WebRTC] Local description (offer) set, signalingState is: ${pc.signalingState}`)
        socket.emit(ROOM_SOCKET_EVENTS.WEBRTC_OFFER, {
          roomId,
          toSocketId: remoteSocketId,
          offer,
        })
      } catch (err) {
        console.error(`[WebRTC] Renegotiation offer creation failed for ${remoteSocketId}:`, err)
      }
    }
  }, [roomId])

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

  const requestDeviceAccess = useCallback(async (kind: 'microphone' | 'camera' | 'both') => {
    if (!navigator.mediaDevices?.getUserMedia) return false

    const wantsAudio = kind === 'microphone' || kind === 'both'
    const wantsVideo = kind === 'camera' || kind === 'both'
    const permissionSnapshotBeforeRequest = await readMediaPermissionStates()

    console.info('[RoomPermissions] request:start', {
      kind,
      wantsAudio,
      wantsVideo,
      permissionSnapshotBeforeRequest,
      userActivationActive: navigator.userActivation?.isActive ?? null,
      userActivationHasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
    })

    if (!localStreamRef.current) {
      localStreamRef.current = new MediaStream()
    }

    const nextMedia = { ...localMediaRef.current }
    let grantedAnyDevice = false
    const applyRequestedStream = async (requestedStream: MediaStream) => {
      const newAudioTrack = requestedStream.getAudioTracks()[0] ?? null
      if (newAudioTrack) {
        localStreamRef.current!.getAudioTracks().forEach((track) => {
          localStreamRef.current?.removeTrack(track)
          track.stop()
        })
        newAudioTrack.enabled = true
        localStreamRef.current!.addTrack(newAudioTrack)
        await replaceOutgoingAudioTrack(newAudioTrack)
        nextMedia.isMicOn = true
        grantedAnyDevice = true
      }

      const newVideoTrack = requestedStream.getVideoTracks()[0] ?? null
      if (newVideoTrack) {
        await replaceLocalCameraTrack(newVideoTrack, true)
        nextMedia.isCameraOn = true
        grantedAnyDevice = true
      }
    }

    try {
      console.info('[RoomPermissions] getUserMedia:calling', {
        kind,
        constraints: {
          audio: wantsAudio ? true : false,
          video: wantsVideo ? true : false,
        },
      })

      const requestedStream = await navigator.mediaDevices.getUserMedia({
        audio: wantsAudio ? true : false,
        video: wantsVideo ? true : false,
      })

      console.info('[RoomPermissions] getUserMedia:resolved', {
        kind,
        audioTracks: requestedStream.getAudioTracks().length,
        videoTracks: requestedStream.getVideoTracks().length,
      })

      await applyRequestedStream(requestedStream)
    } catch (err: any) {
      console.error('[WebRTC] request device access failed:', err)
      console.info('[RoomPermissions] getUserMedia:rejected', {
        kind,
        name: err?.name ?? null,
        message: err?.message ?? null,
      })
      if (kind === 'both' && !isPermissionDeniedMediaError(err)) {
        const fallbackRequests: Promise<void>[] = []
        if (wantsAudio) {
          fallbackRequests.push(
            navigator.mediaDevices.getUserMedia({ audio: true, video: false })
              .then(applyRequestedStream)
              .catch((fallbackErr) => {
                console.warn('[WebRTC] fallback microphone request failed:', fallbackErr)
              }),
          )
        }
        if (wantsVideo) {
          fallbackRequests.push(
            navigator.mediaDevices.getUserMedia({ audio: false, video: true })
              .then(applyRequestedStream)
              .catch((fallbackErr) => {
                console.warn('[WebRTC] fallback camera request failed:', fallbackErr)
              }),
          )
        }
        await Promise.all(fallbackRequests)
      }

      if (grantedAnyDevice) {
        setMediaError(null)
      } else if (isPermissionDeniedMediaError(err)) {
        setMediaError('permissions')
      } else if (kind === 'both') {
        setMediaError('hardware')
      }
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
              isMicOn: nextMedia.isMicOn,
              isCameraOn: nextMedia.isCameraOn,
              videoStream: nextMedia.isCameraOn ? localStreamRef.current : null,
            }
          : participant,
      ),
    }))
    if (grantedAnyDevice) {
      setMediaError(null)
    }
    emitMediaStatus(nextMedia)
    const permissionSnapshotAfterRequest = await refreshMediaPermissions()
    console.info('[RoomPermissions] request:end', {
      kind,
      grantedAnyDevice,
      permissionSnapshotAfterRequest,
    })
    return grantedAnyDevice
  }, [
    emitMediaStatus,
    refreshMediaPermissions,
    replaceLocalCameraTrack,
    replaceOutgoingAudioTrack,
    roomId,
  ])

  const cleanupWebRtc = useCallback(() => {
    speakingDetectorsRef.current.forEach((_, socketId) => {
      closeSpeakingDetector(socketId)
    })
    audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    remoteStreamsRef.current.clear()
    remoteScreenStreamsRef.current.clear()
    remoteCameraStreamIdsRef.current.clear()
    remoteScreenStreamIdsRef.current.clear()
    pendingIceCandidatesRef.current.clear()
    offeredPeersRef.current.clear()
    peerRecoveryTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    peerRecoveryTimeoutsRef.current.clear()
    peerIceRestartAttemptsRef.current.clear()
    peerConnectedOnceRef.current.clear()
    localHadAnyPeerConnectionRef.current = false
    isolatedPeerFailuresRef.current.clear()
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    localScreenStreamRef.current?.getTracks().forEach((track) => track.stop())
    localScreenStreamRef.current = null
    cameraTrackRef.current = null
    screenTrackRef.current?.stop()
    screenTrackRef.current = null
    screenAudioTrackRef.current?.stop()
    screenAudioTrackRef.current = null
  }, [closeSpeakingDetector])

  useEffect(() => {
    if (!peerFailureRevision || localHadAnyPeerConnectionRef.current) return

    const socket = getSocket()
    const localSocketId = socket?.id
    if (!socket?.connected || !localSocketId) return

    const remoteSocketIds = roomUsersRef.current
      .map((user) => user.socketId)
      .filter((socketId) => socketId && socketId !== localSocketId)

    if (!remoteSocketIds.length) return
    if (!remoteSocketIds.every((socketId) => isolatedPeerFailuresRef.current.has(socketId))) return

    socket.emit(ROOM_SOCKET_EVENTS.LEAVE_ROOM)
    cleanupWebRtc()
    disconnectSocket()
    setJoinWarningMessage(
      'No pudimos establecer la conexion de audio y video con esta sala. Si tu red necesita TURN, es posible que el relay no este disponible en este momento.',
    )
    setSession((prev) => ({
      ...prev,
      connectionStatus: 'disconnected',
      participants: prev.participants.filter((participant) => participant.isLocal),
    }))
  }, [cleanupWebRtc, peerFailureRevision])

  useEffect(() => {
    let cancelled = false
    const reactionTimeouts = reactionTimeoutsRef.current
    const captionClearTimeouts = captionClearTimeoutsRef.current

    async function init() {
      try {
        const initialPermissions = await refreshMediaPermissions()
        const token = await getIdToken()
        if (cancelled) return
        const roomMembers = await getRoomMembers(token, roomId).catch(() => [])
        if (cancelled) return
        memberByUidRef.current = new Map(roomMembers.map((member) => [member.uid, member]))

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream()
        }

        const canAutoRequestAudio = initialPermissions.microphone === 'granted'
        const canAutoRequestVideo = initialPermissions.camera === 'granted'
        let nextMedia = {
          ...initialMedia,
          isMicOn: false,
          isCameraOn: false,
        }

        if (
          navigator.mediaDevices?.getUserMedia &&
          (canAutoRequestAudio || canAutoRequestVideo)
        ) {
          const applyInitialStream = (stream: MediaStream) => {
            stream.getAudioTracks().forEach((track) => {
              track.enabled = initialMedia.isMicOn
              localStreamRef.current?.addTrack(track)
            })

            const [videoTrack] = stream.getVideoTracks()
            if (videoTrack) {
              cameraTrackRef.current = videoTrack
              if (initialMedia.isCameraOn) {
                localStreamRef.current?.addTrack(videoTrack)
              } else {
                videoTrack.stop()
                cameraTrackRef.current = null
              }
            }
          }

          try {
            const grantedStream = await navigator.mediaDevices.getUserMedia({
              audio: canAutoRequestAudio
                ? createRoomAudioConstraints(lobbyMediaPrefs?.selectedMicId)
                : false,
              video: canAutoRequestVideo
                ? createCameraConstraints(
                    lobbyMediaPrefs?.selectedCameraId,
                    cameraFacingModeRef.current,
                  )
                : false,
            })

            localStreamRef.current = new MediaStream()
            applyInitialStream(grantedStream)

            const hasAudio = localStreamRef.current.getAudioTracks().length > 0
            const hasVideo = localStreamRef.current.getVideoTracks().length > 0
            const nextMicOn = hasAudio && initialMedia.isMicOn
            const nextCameraOn = hasVideo && initialMedia.isCameraOn

            localStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = nextMicOn
            })

            nextMedia = {
              ...initialMedia,
              isMicOn: nextMicOn,
              isCameraOn: nextCameraOn,
            }
            setMediaError(null)
          } catch (err: any) {
            console.error('[WebRTC] getUserMedia failed for granted devices:', err)
            localStreamRef.current = new MediaStream()
            cameraTrackRef.current = null

            if (!isPermissionDeniedMediaError(err)) {
              const fallbackRequests: Promise<void>[] = []
              if (canAutoRequestAudio) {
                fallbackRequests.push(
                  navigator.mediaDevices.getUserMedia({
                    audio: createRoomAudioConstraints(lobbyMediaPrefs?.selectedMicId),
                    video: false,
                  })
                    .then(applyInitialStream)
                    .catch((fallbackErr) => {
                      console.warn('[WebRTC] initial microphone fallback failed:', fallbackErr)
                    }),
                )
              }
              if (canAutoRequestVideo) {
                fallbackRequests.push(
                  navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: createCameraConstraints(
                      lobbyMediaPrefs?.selectedCameraId,
                      cameraFacingModeRef.current,
                    ),
                  })
                    .then(applyInitialStream)
                    .catch((fallbackErr) => {
                      console.warn('[WebRTC] initial camera fallback failed:', fallbackErr)
                    }),
                )
              }
              await Promise.all(fallbackRequests)
            }

            const hasAudio = localStreamRef.current.getAudioTracks().length > 0
            const hasVideo = localStreamRef.current.getVideoTracks().length > 0
            nextMedia = {
              ...initialMedia,
              isMicOn: hasAudio && initialMedia.isMicOn,
              isCameraOn: hasVideo && initialMedia.isCameraOn,
            }

            if (hasAudio || hasVideo || isPermissionDeniedMediaError(err)) {
              setMediaError(null)
            } else {
              setMediaError('hardware')
            }
          }
        }

        localMediaRef.current = nextMedia
        setSession((prev) => ({
          ...prev,
          localMedia: nextMedia,
          participants: prev.participants.map((participant) =>
            participant.isLocal
              ? {
                  ...participant,
                  isMicOn: nextMedia.isMicOn,
                  isCameraOn: nextMedia.isCameraOn,
                  videoStream: nextMedia.isCameraOn ? localStreamRef.current : null,
                }
              : participant,
          ),
        }))

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

          const isInitialLoad = roomUsersRef.current.length === 0
          const hasNewUser = !isInitialLoad && users.some((u) => !roomUsersRef.current.some((exist) => exist.socketId === u.socketId))
          const hasLeftUser = !isInitialLoad && roomUsersRef.current.some((exist) => !users.some((u) => u.socketId === exist.socketId))

          roomUsersRef.current = users

          if (hasNewUser) {
            playSynthesizedSound('join')
          } else if (hasLeftUser) {
            playSynthesizedSound('leave')
          }

          // FIX: para el usuario local, usar el estado conocido localmente (localMediaRef)
          // en lugar de confiar en lo que el servidor devuelve, que puede estar desactualizado
          const participants = toRoomParticipants(
            users,
            roomId,
            memberByUidRef.current,
            firebaseUser?.uid,
            localMediaRef.current.isCameraOn ? localStreamRef.current : null,
            localMediaRef.current.isScreenSharing ? localScreenStreamRef.current : null,
            remoteStreamsRef.current,
            remoteScreenStreamsRef.current,
            localMediaRef.current,
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
                    : (cameraOn
                      ? (remoteStreamsRef.current.get(participant.socketId) ?? participant.videoStream)
                      : participant.videoStream),
                }
              }),
            }
          })
        })

        socket.on(ROOM_SOCKET_EVENTS.REACTION_NEW, receiveReaction)

        socket.on(ROOM_SOCKET_EVENTS.CAPTION_UPDATE, receiveCaption)

        socket.on(ROOM_SOCKET_EVENTS.CAPTION_CLEAR, receiveCaptionClear)

        socket.on(ROOM_SOCKET_EVENTS.WEBRTC_OFFER, async (payload: WebRtcOfferPayload) => {
          console.log(`[WebRTC] Socket received WEBRTC_OFFER from: ${payload.fromSocketId}`)
          if (cancelled || payload.roomId !== roomId) return

          try {
            const pc = createPeerConnection(payload.fromSocketId)
            console.log(`[WebRTC] Setting remote description (offer) for peer ${payload.fromSocketId}. signalingState: ${pc.signalingState}`)
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
            console.log(`[WebRTC] Remote description (offer) set successfully. Flushing pending candidates...`)
            await flushPendingIceCandidates(payload.fromSocketId)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            console.log(`[WebRTC] Local description (answer) set successfully. signalingState: ${pc.signalingState}`)
            await flushPendingIceCandidates(payload.fromSocketId)
            socket.emit(ROOM_SOCKET_EVENTS.WEBRTC_ANSWER, {
              roomId,
              toSocketId: payload.fromSocketId,
              answer,
            })
            setupNegotiationHandler(payload.fromSocketId, pc)
          } catch (err) {
            console.error(`[WebRTC] Error handling offer from ${payload.fromSocketId}:`, err)
          }
        })

        socket.on(ROOM_SOCKET_EVENTS.WEBRTC_ANSWER, async (payload: WebRtcAnswerPayload) => {
          console.log(`[WebRTC] Socket received WEBRTC_ANSWER from: ${payload.fromSocketId}`)
          if (cancelled || payload.roomId !== roomId) return

          try {
            const pc = peerConnectionsRef.current.get(payload.fromSocketId)
            if (!pc) {
              console.warn(`[WebRTC] Answer received but no peer connection exists for socket: ${payload.fromSocketId}`)
              return
            }
            if (pc.signalingState === 'stable') {
              console.log(`[WebRTC] peer connection for ${payload.fromSocketId} is already stable, ignoring answer.`)
              return
            }

            console.log(`[WebRTC] Setting remote description (answer) for peer ${payload.fromSocketId}. signalingState: ${pc.signalingState}`)
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
            console.log(`[WebRTC] Remote description (answer) set successfully. Flushing pending candidates...`)
            await flushPendingIceCandidates(payload.fromSocketId)
            setupNegotiationHandler(payload.fromSocketId, pc)
          } catch (err) {
            console.error(`[WebRTC] Error handling answer from ${payload.fromSocketId}:`, err)
          }
        })

        socket.on(ROOM_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, async (payload: WebRtcIceCandidatePayload) => {
          if (cancelled || payload.roomId !== roomId) return

          try {
            const pc = createPeerConnection(payload.fromSocketId)
            // Queue candidates if remote description is not set yet, or if connection is currently negotiating (signalingState is not stable)
            if (!pc.remoteDescription || pc.signalingState !== 'stable') {
              console.log(`[WebRTC] Queueing candidate from ${payload.fromSocketId}. signalingState: ${pc.signalingState}`)
              const pending = pendingIceCandidatesRef.current.get(payload.fromSocketId) ?? []
              pending.push(payload.candidate)
              pendingIceCandidatesRef.current.set(payload.fromSocketId, pending)
              return
            }

            console.log(`[WebRTC] Adding ICE candidate from ${payload.fromSocketId} directly.`)
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate))
          } catch (err) {
            console.error(`[WebRTC] Failed to add ICE candidate from ${payload.fromSocketId}:`, err)
          }
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

        socket.on('roomMemberMuted', (payload: { roomId: string; uid: string }) => {
          if (cancelled || payload.roomId !== roomId) return
          if (payload.uid === firebaseUser?.uid) {
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = false
              })
            }
            const nextMedia = { ...localMediaRef.current, isMicOn: false }
            localMediaRef.current = nextMedia
            writeLobbyMediaState(roomId, nextMedia)
            if (localCaptionsStateRef.current.enabled) {
              resetLocalCaptionBuffers()
              emitCaptionClear()
            }
            setSession((prev) => ({
              ...prev,
              localMedia: nextMedia,
              participants: prev.participants.map((p) =>
                p.isLocal ? { ...p, isMicOn: false } : p,
              ),
            }))
            emitMediaStatus(nextMedia)
          }
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
        socket.off(ROOM_SOCKET_EVENTS.REACTION_NEW, receiveReaction)
        socket.off(ROOM_SOCKET_EVENTS.CAPTION_UPDATE, receiveCaption)
        socket.off(ROOM_SOCKET_EVENTS.CAPTION_CLEAR, receiveCaptionClear)
        socket.off(ROOM_SOCKET_EVENTS.WEBRTC_OFFER)
        socket.off(ROOM_SOCKET_EVENTS.WEBRTC_ANSWER)
        socket.off(ROOM_SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE)
        socket.off(ROOM_SOCKET_EVENTS.ERROR_MESSAGE)
        socket.off(ROOM_SOCKET_EVENTS.ROOM_DELETED)
        socket.off('roomMemberMuted')
      }
      cleanupWebRtc()
      stopLocalCaptions({ emitClear: true })
      captionClearTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
      captionClearTimeouts.clear()
      reactionTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
      reactionTimeouts.clear()
      disconnectSocket()
    }
  }, [
    cleanupWebRtc,
    createPeerConnection,
    emitJoinRoom,
    emitCaptionClear,
    emitMediaStatus,
    firebaseUser?.uid,
    flushPendingIceCandidates,
    getIdToken,
    initialMedia,
    lobbyMediaPrefs,
    navigate,
    roomId,
    receiveCaption,
    receiveCaptionClear,
    receiveReaction,
    refreshMediaPermissions,
    resetLocalCaptionBuffers,
    retryCount,
    setupNegotiationHandler,
    stopLocalCaptions,
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
    if (!localStreamRef.current) return
    const audioTracks = localStreamRef.current.getAudioTracks()
    const nextMic = !session.localMedia.isMicOn
    audioTracks.forEach((track) => {
      track.enabled = nextMic
    })
    if (!nextMic && localCaptionsStateRef.current.enabled) {
      resetLocalCaptionBuffers()
      emitCaptionClear()
    }

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
  }, [emitCaptionClear, emitMediaStatus, resetLocalCaptionBuffers, roomId, session.localMedia])

  // FIX: toggleCamera ahora usa track.stop() para liberar el hardware (apaga el LED de la cámara)
  // y getUserMedia para adquirir un nuevo track al encender, en lugar de solo track.enabled
  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) return
    const nextCam = !session.localMedia.isCameraOn

    if (!nextCam) {
      // APAGAR: detener tracks de la cámara para liberar el hardware
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
      }
      localMediaRef.current = nextMedia
      writeLobbyMediaState(roomId, nextMedia)
      setSession((prev) => ({
        ...prev,
        localMedia: nextMedia,
        participants: prev.participants.map((p) =>
          p.isLocal ? { ...p, isCameraOn: false, videoStream: null } : p,
        ),
      }))
      emitMediaStatus(nextMedia)

    } else {
      // ENCENDER: adquirir nuevo track desde getUserMedia (el anterior fue detenido)
      if (!navigator.mediaDevices?.getUserMedia) return

      let newTrack: MediaStreamTrack | null = null
      try {
        setMediaError(null)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: createCameraConstraints(undefined, cameraFacingModeRef.current),
        })
        newTrack = stream.getVideoTracks()[0] ?? null
      } catch (err: any) {
        console.error('[WebRTC] re-acquire camera failed:', err)
        if (isPermissionDeniedMediaError(err)) {
          setMediaError('permissions')
        } else {
          setMediaError('hardware')
        }
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
      console.log('[WebRTC] Stopping screen share...')
      const currentScreenStream = localScreenStreamRef.current
      screenTrackRef.current = null
      screenAudioTrackRef.current = null
      localScreenStreamRef.current = null
      const currentScreenTracks = currentScreenStream?.getTracks() ?? []
      currentScreenTracks.forEach((track) => track.stop())

      if (currentScreenTracks.length > 0) {
        await Promise.all(
          Array.from(peerConnectionsRef.current.values()).map(async (pc) => {
            currentScreenTracks.forEach((track) => {
              const sender = pc.getSenders().find((candidate) => candidate.track === track)
              if (!sender) return
              try {
                pc.removeTrack(sender)
              } catch (err) {
                console.warn('[WebRTC] Failed to remove screen track sender:', err)
              }
            })
          })
        )
      }

      const nextMedia = {
        ...session.localMedia,
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
              isScreenSharing: false,
              screenStream: null,
            }
            : participant,
        ),
      }))
      emitMediaStatus(nextMedia)
      return
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setScreenShareWarningMessage(getScreenShareUnavailableMessage())
      return
    }

    try {
      setScreenShareWarningMessage(null)
      console.log('[WebRTC] Starting screen share...')
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })
      const [screenTrack] = screenStream.getVideoTracks()
      const [screenAudioTrack] = screenStream.getAudioTracks()
      if (!screenTrack) {
        screenStream.getTracks().forEach((track) => track.stop())
        return
      }

      screenTrackRef.current = screenTrack
      screenAudioTrackRef.current = screenAudioTrack ?? null
      if (screenAudioTrack && 'contentHint' in screenAudioTrack) {
        screenAudioTrack.contentHint = 'music'
      }
      localScreenStreamRef.current = screenStream

      playSynthesizedSound('screen-share')

      await Promise.all(
        Array.from(peerConnectionsRef.current.values()).map(async (pc) => {
          screenStream.getTracks().forEach((track) => {
            pc.addTrack(track, screenStream)
          })
        })
      )

      screenTrack.onended = () => {
        if (screenTrackRef.current !== screenTrack) return
        console.log('[WebRTC] Screen share track ended (e.g. stopped from browser bar)')
        screenTrackRef.current = null
        screenAudioTrackRef.current = null
        localScreenStreamRef.current = null
        const endedScreenTracks = screenStream.getTracks()
        endedScreenTracks.forEach((track) => track.stop())

        Promise.all(
          Array.from(peerConnectionsRef.current.values()).map(async (pc) => {
            endedScreenTracks.forEach((track) => {
              const sender = pc.getSenders().find((candidate) => candidate.track === track)
              if (!sender) return
              try {
                pc.removeTrack(sender)
              } catch (err) {
                console.warn('[WebRTC] Failed to remove screen track sender on ended:', err)
              }
            })
          })
        ).catch(() => undefined)

        setSession((prev) => {
          const nextMedia = {
            ...prev.localMedia,
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
                  isScreenSharing: false,
                  screenStream: null,
                }
                : participant,
            ),
          }
        })
      }

      const nextMedia = {
        ...session.localMedia,
        isScreenSharing: true,
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
              isScreenSharing: true,
              screenStream,
            }
            : participant,
        ),
      }))
      emitMediaStatus(nextMedia)
    } catch (err) {
      console.error('[WebRTC] screen share failed:', err)
      const message = getScreenShareFailureMessage(err)
      if (message) {
        setScreenShareWarningMessage(message)
      }
    }
  }, [emitMediaStatus, roomId, session.localMedia])

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

  const toggleLocalCaptions = useCallback(() => {
    const isMobileEnvironment =
      typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isMobileEnvironment) {
      setLocalCaptionsState({
        enabled: false,
        status: 'unsupported',
        error: 'Los subtítulos locales no están disponibles en celulares.',
        model: null,
      })
      return
    }

    if (localCaptionsStateRef.current.enabled) {
      stopLocalCaptions({ emitClear: true })
      return
    }

    void (async () => {
      try {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0] ?? null
        const hasActiveMic =
          Boolean(audioTrack) &&
          audioTrack?.readyState === 'live' &&
          audioTrack.enabled &&
          localMediaRef.current.isMicOn

        if (!hasActiveMic) {
          setLocalCaptionsState({ enabled: false, status: 'loading', error: null, model: null })
          const granted = await requestDeviceAccess('microphone')
          if (!granted) {
            setLocalCaptionsState({
              enabled: false,
              status: 'error',
              error: 'Activa el microfono para generar subtitulos locales.',
              model: null,
            })
            return
          }
        }

        await startLocalCaptions()
      } catch (error) {
        console.error('[Captions] activation flow failed:', error)
        stopLocalCaptions({ emitClear: false })
        setLocalCaptionsState({
          enabled: false,
          status: 'error',
          error: 'No se pudieron activar los subtitulos locales.',
          model: null,
        })
      }
    })()
  }, [requestDeviceAccess, setLocalCaptionsState, startLocalCaptions, stopLocalCaptions])

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

  const sendReaction = useCallback((emoji: RoomReactionEmoji) => {
    const socket = getSocket()
    if (!socket?.connected) return

    socket.emit(ROOM_SOCKET_EVENTS.REACTION_SEND, { roomId, emoji })
  }, [roomId])

  const leaveRoom = useCallback((options?: LeaveRoomOptions) => {
    playSynthesizedSound('hangup')
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit(ROOM_SOCKET_EVENTS.LEAVE_ROOM)
    }
    disconnectSocket()
    setTimeout(() => {
      navigate('/dashboard', {
        replace: options?.replace,
        state: options?.state,
      })
    }, 150)
  }, [navigate])

  const retry = useCallback(() => {
    console.log('[WebRTC] Retrying connection and media initialization...')
    setMediaError(null)
    setRetryCount((prev) => prev + 1)
  }, [])

  const muteParticipant = useCallback((targetUid: string) => {
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('roomMemberMuted', { roomId, uid: targetUid })
    }
  }, [roomId])

  const kickParticipant = useCallback((targetUid: string) => {
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, { roomId, uid: targetUid })
    }
  }, [roomId])

  const actions: RoomSessionActions = {
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleMirrorLocalVideo,
    setOutputVolume,
    switchCamera,
    toggleLocalCaptions,
    sendMessage,
    sendReaction,
    leaveRoom,
    loadMoreHistory,
    retry,
    muteParticipant,
    kickParticipant,
  }

  const clearJoinWarning = useCallback(() => {
    setJoinWarningMessage(null)
  }, [])

  const clearScreenShareWarning = useCallback(() => {
    setScreenShareWarningMessage(null)
  }, [])

  const permissionWarnings = {
    microphone:
      mediaPermissions.microphone !== 'granted' &&
      mediaPermissions.microphone !== 'unsupported',
    camera:
      mediaPermissions.camera !== 'granted' &&
      mediaPermissions.camera !== 'unsupported',
  }

  return {
    session,
    actions,
    joinWarningMessage,
    clearJoinWarning,
    screenShareWarningMessage,
    clearScreenShareWarning,
    mediaError,
    mediaPermissions,
    permissionWarnings,
    refreshMediaPermissions,
    requestDeviceAccess,
  }
}
