import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AlertCircle, CameraOff, Loader2, Mic, RefreshCw, ShieldAlert, Video } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getSocket } from '@/config/socket.config'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { BaseModal } from '@/shared/components/ui/BaseModal'
import { Button } from '@/shared/components/ui/Button'
import { WarningModal } from '@/shared/components/ui/WarningModal'
import { ConfirmModal } from '@/shared/components/ui/ConfirmModal'
import { createRoomKickedDashboardState } from '../constants/roomDeletionNotice'
import { getRoomMembers } from '../api/roomsApi'
import { ChatPanel } from '../components/ChatPanel'
import { ControlBar } from '../components/ControlBar'
import { ParticipantsPanel } from '../components/ParticipantsPanel'
import { ReactionLayer } from '../components/ReactionLayer'
import { RoomHeader } from '../components/RoomHeader'
import { RoomSettingsPanel } from '../components/RoomSettingsPanel'
import { VideoGrid } from '../components/VideoGrid'
import { useRoom } from '../hooks/useRoom'
import { useRoomSession } from '../hooks/useRoomSession'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import { createCooldownSound } from '../utils/roomSounds'
import type { RoomSidebarPanel } from '../types/roomSession'
import type { RoomMember } from '@/types/room'

export type RoomMediaStatus =
  | 'requesting_permissions'
  | 'webrtc_connecting'
  | 'av_active'
  | 'no_camera'
  | 'no_mic'
  | 'reconnecting'
  | 'error_hardware'
  | 'error_webrtc'

type PermissionPromptTarget = 'microphone' | 'camera'

function buildDeniedPermissionMessage(target: PermissionPromptTarget, showCombinedOption: boolean) {
  if (target === 'microphone') {
    return showCombinedOption
      ? 'El navegador tiene bloqueado el acceso al microfono y tambien falta el de la camara. Debes activarlos desde el icono del sitio en la barra de direcciones.'
      : 'El navegador tiene bloqueado el acceso al microfono. Debes activarlo desde el icono del sitio en la barra de direcciones.'
  }

  return showCombinedOption
    ? 'El navegador tiene bloqueado el acceso a la camara y tambien falta el del microfono. Debes activarlos desde el icono del sitio en la barra de direcciones.'
    : 'El navegador tiene bloqueado el acceso a la camara. Debes activarla desde el icono del sitio en la barra de direcciones.'
}

function buildDeniedPermissionSteps(target: PermissionPromptTarget) {
  if (target === 'microphone') {
    return [
      'Haz clic en el icono del sitio o en el candado que aparece junto a la barra de direcciones.',
      'Busca la opcion Microfono y activala alli.',
      'Luego vuelve a la sala para seguir usando el microfono.',
    ]
  }

  return [
    'Haz clic en el icono del sitio o en el candado que aparece junto a la barra de direcciones.',
    'Busca la opcion Camara y activala alli.',
    'Luego vuelve a la sala para seguir usando la camara.',
  ]
}

function buildMissingPermissionsMessage(hasMicWarning: boolean, hasCameraWarning: boolean) {
  if (hasMicWarning && hasCameraWarning) {
    return 'Puedes unirte a la sala y visualizar a los demás participantes con normalidad. Sin embargo, no podrás utilizar el micrófono ni activar la cámara hasta que habilites estos permisos en tu navegador.'
  }

  if (hasMicWarning) {
    return 'No tienes permisos para usar el micrófono. Puedes entrar a la sala y ver a los demás con normalidad, pero no podrás hablar hasta habilitarlo en el navegador.'
  }

  return 'No tienes permisos para usar la cámara. Puedes entrar a la sala y ver a los demás con normalidad, pero no podrás encenderla hasta habilitarla en el navegador.'
}

function buildPermissionPromptMessage(target: PermissionPromptTarget, showCombinedOption: boolean) {
  if (target === 'microphone') {
    return showCombinedOption
      ? 'Para hablar en la sala necesitas permitir el micrófono. Si también quieres encender tu cámara de una vez, puedes solicitar ambos permisos juntos.'
      : 'Para hablar en la sala necesitas permitir el micrófono en el navegador.'
  }

  return showCombinedOption
    ? 'Para encender tu cámara necesitas permitir ese acceso. Si también quieres hablar, puedes solicitar cámara y micrófono juntos.'
    : 'Para encender tu cámara necesitas permitir ese acceso en el navegador.'
}

export default function RoomPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roomId = id ?? ''
  const firebaseUser = useAuthStore((s) => s.user)

  const { room, setRoom } = useRoom(roomId)
  const {
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
  } = useRoomSession(
    roomId,
    room?.roomCode,
  )

  const [activePanel, setActivePanel] = useState<RoomSidebarPanel | null>(() => {
    if (typeof window === 'undefined') return 'chat'
    return window.innerWidth >= 768 ? 'chat' : null
  })
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [removedMemberUids, setRemovedMemberUids] = useState<Set<string>>(() => new Set())
  const [muteConfirmTarget, setMuteConfirmTarget] = useState<{ uid: string; displayName: string } | null>(null)
  const [kickConfirmTarget, setKickConfirmTarget] = useState<{ uid: string; displayName: string } | null>(null)
  const [showMutedByHostWarning, setShowMutedByHostWarning] = useState(false)
  const [permissionPromptTarget, setPermissionPromptTarget] = useState<PermissionPromptTarget | null>(null)
  const [showMissingPermissionsModal, setShowMissingPermissionsModal] = useState(false)

  const handleRequestMute = useCallback((uid: string) => {
    const participant = session.participants.find((p) => p.id === uid)
    const member = members.find((m) => m.uid === uid)
    const displayName = participant?.displayName || member?.displayName || member?.username || 'este miembro'
    setMuteConfirmTarget({ uid, displayName })
  }, [session.participants, members])

  const handleRequestKick = useCallback((uid: string) => {
    const participant = session.participants.find((p) => p.id === uid)
    const member = members.find((m) => m.uid === uid)
    const displayName = participant?.displayName || member?.displayName || member?.username || 'este miembro'
    setKickConfirmTarget({ uid, displayName })
  }, [session.participants, members])

  const hasBeenConnectedRef = useRef(false)
  const hasShownMissingPermissionsRef = useRef(false)
  const permissionRequestPointerLockRef = useRef(false)
  const [showReconnecting, setShowReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const mediaStatus = useMemo<RoomMediaStatus>(() => {
    if (showReconnecting) return 'reconnecting'

    if (mediaError === 'hardware') return 'error_hardware'
    if (mediaError === 'webrtc') return 'error_webrtc'

    if (session.connectionStatus === 'connecting') {
      return 'webrtc_connecting'
    }

    if (session.connectionStatus === 'disconnected') {
      return 'requesting_permissions'
    }

    if (!session.localMedia.isCameraOn) {
      return 'no_camera'
    }
    if (!session.localMedia.isMicOn) {
      return 'no_mic'
    }

    return 'av_active'
  }, [
    showReconnecting,
    mediaError,
    session.connectionStatus,
    session.localMedia.isCameraOn,
    session.localMedia.isMicOn,
  ])

  useEffect(() => {
    if (session.connectionStatus === 'connected') {
      hasBeenConnectedRef.current = true
      setShowReconnecting(false)
      setReconnectAttempts(0)
    } else if (
      session.connectionStatus === 'disconnected' &&
      hasBeenConnectedRef.current
    ) {
      setShowReconnecting(true)
      setReconnectAttempts((prev) => prev + 1)
    }
  }, [session.connectionStatus])

  useEffect(() => {
    if (session.connectionStatus !== 'connected') return
    if (hasShownMissingPermissionsRef.current) return
    if (!permissionWarnings.microphone && !permissionWarnings.camera) return

    hasShownMissingPermissionsRef.current = true
    setShowMissingPermissionsModal(true)
  }, [permissionWarnings.camera, permissionWarnings.microphone, session.connectionStatus])

  const loadMembers = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!roomId) return
    if (options?.showLoading ?? true) {
      setLoadingMembers(true)
    }
    try {
      const token = await getIdToken()
      const data = await getRoomMembers(token, roomId)
      setMembers(data)
    } catch (err) {
      console.error('[RoomMembers] load:error', { roomId, err })
      setMembers([])
    } finally {
      if (options?.showLoading ?? true) {
        setLoadingMembers(false)
      }
    }
  }, [getIdToken, roomId])

  const playMessageSoundRef = useRef(createCooldownSound('message', 2000))

  const [chatHasUnread, setChatHasUnread] = useState(false)
  const prevMsgCountRef = useRef(session.messages.length)

  useEffect(() => {
    if (session.messages.length > prevMsgCountRef.current && activePanel !== 'chat') {
      setChatHasUnread(true)
      playMessageSoundRef.current()
    }
    prevMsgCountRef.current = session.messages.length
  }, [session.messages.length, activePanel])

  useEffect(() => {
    if (activePanel === 'chat') {
      setChatHasUnread(false)
    }
  }, [activePanel])

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    async function loadInitialMembers() {
      try {
        setLoadingMembers(true)
        await loadMembers({ showLoading: false })
        if (!cancelled) setLoadingMembers(false)
      } catch {
        if (!cancelled) setLoadingMembers(false)
      }
    }
    loadInitialMembers()
    return () => { cancelled = true }
  }, [roomId, loadMembers])

  useEffect(() => {
    if (session.participants.length === 0) return
    loadMembers({ showLoading: false })
  }, [loadMembers, session.participants.length])

  useEffect(() => {
    if (session.connectionStatus !== 'connected') return
    const socket = getSocket()
    if (!socket) return
    const handleRoomMemberRemoved = (payload: { roomId: string; uid: string }) => {
      if (payload.roomId !== roomId) return

      if (payload.uid === firebaseUser?.uid) {
        actions.leaveRoom()
        navigate('/dashboard', { replace: true, state: createRoomKickedDashboardState() })
        return
      }

      setRemovedMemberUids((prev) => new Set(prev).add(payload.uid))
      setMembers((prev) => prev.filter((member) => member.uid !== payload.uid))
    }
    const handleRoomMemberMuted = (payload: { roomId: string; uid: string }) => {
      if (payload.roomId !== roomId) return
      if (payload.uid === firebaseUser?.uid) {
        setShowMutedByHostWarning(true)
      }
    }
    socket.on(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleRoomMemberRemoved)
    socket.on('roomMemberMuted', handleRoomMemberMuted)
    return () => {
      socket.off(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleRoomMemberRemoved)
      socket.off('roomMemberMuted', handleRoomMemberMuted)
    }
  }, [roomId, session.connectionStatus, firebaseUser?.uid, actions, navigate])

  useEffect(() => {
    setRemovedMemberUids(new Set())
  }, [roomId])

  const visibleMembers = useMemo(
    () => members.filter((member) => !removedMemberUids.has(member.uid)),
    [members, removedMemberUids],
  )

  const visibleOnlineParticipants = useMemo(
    () => session.participants.filter((participant) => !removedMemberUids.has(participant.id)),
    [removedMemberUids, session.participants],
  )

  const roomName = room?.name ?? session.roomName
  const isOwner = room?.ownerUid === firebaseUser?.uid
  const promptShowsCombinedOption = permissionPromptTarget === 'microphone'
    ? permissionWarnings.camera
    : permissionWarnings.microphone
  const isPermissionPromptDenied = permissionPromptTarget === 'microphone'
    ? mediaPermissions.microphone === 'denied'
    : permissionPromptTarget === 'camera'
      ? mediaPermissions.camera === 'denied'
      : false
  const deniedPermissionSteps = permissionPromptTarget
    ? buildDeniedPermissionSteps(permissionPromptTarget)
    : []
  const missingPermissionsMessage = buildMissingPermissionsMessage(
    permissionWarnings.microphone,
    permissionWarnings.camera,
  )

  useEffect(() => {
    if (!permissionPromptTarget) return

    console.info('[RoomPermissions] modal:open', {
      target: permissionPromptTarget,
      mediaPermissions,
      isPermissionPromptDenied,
      userActivationActive: navigator.userActivation?.isActive ?? null,
      userActivationHasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
    })
  }, [isPermissionPromptDenied, mediaPermissions, permissionPromptTarget])

  useDocumentTitle(`${roomName} - Studeo`)

  const handleJoinWarningClose = () => {
    clearJoinWarning()
    navigate('/dashboard')
  }

  const handleMicControl = useCallback(async () => {
    const nextPermissions = await refreshMediaPermissions()
    if (nextPermissions.microphone !== 'granted' && nextPermissions.microphone !== 'unsupported') {
      setPermissionPromptTarget('microphone')
      return
    }
    actions.toggleMic()
  }, [actions, refreshMediaPermissions])

  const handleCameraControl = useCallback(async () => {
    const nextPermissions = await refreshMediaPermissions()
    if (nextPermissions.camera !== 'granted' && nextPermissions.camera !== 'unsupported') {
      setPermissionPromptTarget('camera')
      return
    }
    actions.toggleCamera()
  }, [actions, refreshMediaPermissions])

  const handlePermissionRequest = useCallback(async (kind: 'microphone' | 'camera' | 'both') => {
    console.info('[RoomPermissions] modal:request-click', {
      kind,
      mediaPermissions,
      userActivationActive: navigator.userActivation?.isActive ?? null,
      userActivationHasBeenActive: navigator.userActivation?.hasBeenActive ?? null,
    })
    const granted = await requestDeviceAccess(kind)
    if (granted) {
      setPermissionPromptTarget(null)
    }
  }, [mediaPermissions, requestDeviceAccess])

  const handlePermissionRequestPointerDown = useCallback((kind: 'microphone' | 'camera' | 'both') => {
    permissionRequestPointerLockRef.current = true
    void handlePermissionRequest(kind)
    window.setTimeout(() => {
      permissionRequestPointerLockRef.current = false
    }, 0)
  }, [handlePermissionRequest])

  const handlePermissionRequestClick = useCallback((kind: 'microphone' | 'camera' | 'both') => {
    if (permissionRequestPointerLockRef.current) return
    void handlePermissionRequest(kind)
  }, [handlePermissionRequest])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col">
        <RoomHeader
          roomName={roomName}
          participantCount={session.participants.length}
          roomCode={room?.roomCode ?? session.roomCode}
          room={room}
          isOwner={isOwner}
          onRoomUpdated={setRoom}
          onRoomDeleted={() => navigate('/dashboard')}
          activePanel={activePanel}
          chatHasUnread={chatHasUnread}
          onPanelChange={setActivePanel}
        />

        <div className="relative flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1 flex-col">
            {(mediaStatus === 'requesting_permissions' || mediaStatus === 'webrtc_connecting') && (
              <div className="flex flex-1 flex-col items-center justify-center bg-auth-bg text-center p-6 select-none animate-fade-in">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute h-16 w-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
                  <Loader2 className="h-8 w-8 text-violet-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-auth-title mb-2">
                  {mediaStatus === 'requesting_permissions'
                    ? 'Configurando dispositivos...'
                    : 'Conectando a la sala...'}
                </h3>
                <p className="text-sm text-auth-label max-w-sm">
                  {mediaStatus === 'requesting_permissions'
                    ? 'Por favor, permite el acceso a tu cámara y micrófono en el prompt del navegador.'
                    : 'Estableciendo conexión de audio y video en tiempo real.'}
                </p>
              </div>
            )}

            {(mediaStatus === 'error_hardware' || mediaStatus === 'error_webrtc') && (
              <div className="flex flex-1 flex-col items-center justify-center bg-auth-bg text-center p-6 select-none animate-fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-6 shadow-lg shadow-red-500/5">
                  {mediaStatus === 'error_hardware' && <CameraOff className="h-8 w-8" />}
                  {mediaStatus === 'error_webrtc' && <AlertCircle className="h-8 w-8" />}
                </div>
                <h3 className="text-xl font-bold text-auth-title mb-2">
                  {mediaStatus === 'error_hardware' && 'Error de hardware'}
                  {mediaStatus === 'error_webrtc' && 'Conexión fallida'}
                </h3>
                <p className="text-sm text-auth-label max-w-md mb-6 leading-relaxed">
                  {mediaStatus === 'error_hardware' &&
                    'Tu cámara o micrófono podrían estar desconectados, deshabilitados o en uso por otra aplicación. Por favor verifica tus dispositivos y haz clic en Reintentar.'}
                  {mediaStatus === 'error_webrtc' &&
                    'No se pudo establecer la conexión de red en tiempo real. Esto puede debido a un firewall restrictivo o a una desconexión temporal de red.'}
                </p>
                <button
                  type="button"
                  onClick={actions.retry}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition-all hover:bg-violet-500 active:scale-95"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </button>
              </div>
            )}

            {mediaStatus !== 'requesting_permissions' &&
              mediaStatus !== 'webrtc_connecting' &&
              mediaStatus !== 'error_hardware' &&
              mediaStatus !== 'error_webrtc' && (
                <VideoGrid
                  participants={session.participants}
                  mirrorLocalVideo={session.mirrorLocalVideo}
                  outputVolume={session.outputVolume}
                  isOwner={isOwner}
                  onMuteParticipant={handleRequestMute}
                  onKickParticipant={handleRequestKick}
                />
              )}

            <ReactionLayer reactions={session.reactions} />

            {showReconnecting && (
              <ReconnectingOverlay attempts={reconnectAttempts} />
            )}

            <ControlBar
              media={session.localMedia}
              onToggleMic={handleMicControl}
              onToggleCamera={handleCameraControl}
              onToggleScreenShare={actions.toggleScreenShare}
              onSendReaction={actions.sendReaction}
              onLeave={actions.leaveRoom}
              disabled={mediaStatus === 'requesting_permissions' || mediaStatus === 'webrtc_connecting'}
              showMicPermissionWarning={permissionWarnings.microphone}
              showCameraPermissionWarning={permissionWarnings.camera}
            />
          </div>

          {activePanel && (
            <button
              type="button"
              aria-label="Cerrar panel"
              onClick={() => setActivePanel(null)}
              className="fixed inset-0 z-30 bg-black/45 md:hidden"
            />
          )}

          <div className="pointer-events-none absolute inset-0 z-40 flex justify-end md:pointer-events-auto md:relative md:z-auto md:h-full md:shrink-0">
            <ChatPanel
              messages={session.messages}
              currentUserId={firebaseUser?.uid}
              onSendMessage={actions.sendMessage}
              loadingHistory={session.loadingHistory}
              hasMoreHistory={session.hasMoreHistory}
              onLoadMore={actions.loadMoreHistory}
              connectionStatus={session.connectionStatus}
              isOpen={activePanel === 'chat'}
              onClose={() => setActivePanel(null)}
            />

            <ParticipantsPanel
              members={visibleMembers}
              onlineParticipants={visibleOnlineParticipants}
              loadingMembers={loadingMembers}
              isOpen={activePanel === 'participants'}
              onClose={() => setActivePanel(null)}
              isOwner={isOwner}
              onMuteParticipant={handleRequestMute}
              onKickParticipant={handleRequestKick}
            />

            <RoomSettingsPanel
              isOpen={activePanel === 'settings'}
              outputVolume={session.outputVolume}
              mirrorLocalVideo={session.mirrorLocalVideo}
              cameraFacingMode={session.cameraFacingMode}
              onOutputVolumeChange={actions.setOutputVolume}
              onToggleMirrorLocalVideo={actions.toggleMirrorLocalVideo}
              onSwitchCamera={actions.switchCamera}
              onClose={() => setActivePanel(null)}
            />

            {activePanel !== 'chat' && (
              <button
                type="button"
                onClick={() => setActivePanel('chat')}
                className="
                  pointer-events-auto absolute left-0 top-1/2 z-40 hidden -translate-x-full -translate-y-1/2
                  h-40 w-8 shrink-0 cursor-pointer
                  md:flex items-center justify-center
                  rounded-l-2xl border border-r-0
                  border-auth-input-border bg-auth-btn text-auth-btn-text
                  transition-all duration-200 hover:brightness-110 hover:w-9
                  shadow-2xl self-center my-auto
                "
              >
                <span
                  className="text-xs font-bold tracking-widest uppercase whitespace-nowrap"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  Mostrar Chat
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <BaseModal
        isOpen={showMissingPermissionsModal}
        onClose={() => setShowMissingPermissionsModal(false)}
        title="Entraste sin permisos"
      >
        <div className="space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <p className="text-sm leading-relaxed text-auth-label">
            {missingPermissionsMessage}
          </p>
          <Button
            type="button"
            onClick={() => setShowMissingPermissionsModal(false)}
            className="w-full cursor-pointer"
          >
            Entendido
          </Button>
        </div>
      </BaseModal>

      <BaseModal
        isOpen={Boolean(permissionPromptTarget)}
        onClose={() => setPermissionPromptTarget(null)}
        title={permissionPromptTarget === 'microphone' ? 'Usar micrófono' : 'Usar cámara'}
      >
        <div className="space-y-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
            {permissionPromptTarget === 'microphone' ? <Mic className="h-7 w-7" /> : <Video className="h-7 w-7" />}
          </div>
          <p className="text-sm leading-relaxed text-auth-label">
            {permissionPromptTarget
              ? (
                isPermissionPromptDenied
                  ? buildDeniedPermissionMessage(permissionPromptTarget, promptShowsCombinedOption)
                  : buildPermissionPromptMessage(permissionPromptTarget, promptShowsCombinedOption)
              )
              : ''}
          </p>
          {isPermissionPromptDenied && (
            <ol className="space-y-2 rounded-2xl border border-auth-input-border bg-auth-input-bg/40 p-4 text-sm text-auth-label">
              {deniedPermissionSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-500">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-col gap-2">
            {permissionPromptTarget === 'microphone' && !isPermissionPromptDenied && (
              <Button
                type="button"
                onMouseDown={() => handlePermissionRequestPointerDown('microphone')}
                onClick={() => handlePermissionRequestClick('microphone')}
                className="w-full cursor-pointer"
              >
                Usar microfono
              </Button>
            )}
            {permissionPromptTarget === 'camera' && !isPermissionPromptDenied && (
              <Button
                type="button"
                onMouseDown={() => handlePermissionRequestPointerDown('camera')}
                onClick={() => handlePermissionRequestClick('camera')}
                className="w-full cursor-pointer"
              >
                Usar camara
              </Button>
            )}
            {permissionPromptTarget && promptShowsCombinedOption && !isPermissionPromptDenied && (
              <Button
                type="button"
                variant="outline"
                onMouseDown={() => handlePermissionRequestPointerDown('both')}
                onClick={() => handlePermissionRequestClick('both')}
                className="w-full cursor-pointer"
              >
                {permissionPromptTarget === 'microphone'
                  ? 'Usar microfono y camara'
                  : 'Usar camara y microfono'}
              </Button>
            )}
          </div>
        </div>
      </BaseModal>

      <WarningModal
        isOpen={Boolean(joinWarningMessage)}
        onClose={handleJoinWarningClose}
        message={
          joinWarningMessage ??
          'Ya te encuentras conectado a esta sala desde otra pestaña o dispositivo.'
        }
      />

      <WarningModal
        isOpen={Boolean(screenShareWarningMessage)}
        onClose={clearScreenShareWarning}
        message={
          screenShareWarningMessage ??
          'No pudimos iniciar la captura de pantalla en este dispositivo.'
        }
      />

      <ConfirmModal
        isOpen={Boolean(muteConfirmTarget)}
        onClose={() => setMuteConfirmTarget(null)}
        onConfirm={() => {
          if (muteConfirmTarget) {
            actions.muteParticipant(muteConfirmTarget.uid)
          }
          setMuteConfirmTarget(null)
        }}
        title="Silenciar participante"
        message={
          muteConfirmTarget ? (
            <span>
              ¿Estás seguro de que deseas silenciar el micrófono de{' '}
              <strong>{muteConfirmTarget.displayName}</strong>?
            </span>
          ) : (
            ''
          )
        }
        confirmText="Silenciar"
        cancelText="Cancelar"
        warning={true}
      />

      <ConfirmModal
        isOpen={Boolean(kickConfirmTarget)}
        onClose={() => setKickConfirmTarget(null)}
        onConfirm={() => {
          if (kickConfirmTarget) {
            actions.kickParticipant(kickConfirmTarget.uid)
          }
          setKickConfirmTarget(null)
        }}
        title="Expulsar participante"
        message={
          kickConfirmTarget ? (
            <span>
              ¿Estás seguro de que deseas expulsar a{' '}
              <strong>{kickConfirmTarget.displayName}</strong> de la sala? Esta acción no se puede deshacer.
            </span>
          ) : (
            ''
          )
        }
        confirmText="Expulsar"
        cancelText="Cancelar"
        critical={true}
      />

      <WarningModal
        isOpen={showMutedByHostWarning}
        onClose={() => setShowMutedByHostWarning(false)}
        message="El anfitrión ha silenciado tu micrófono."
      />
    </div>
  )
}

function ReconnectingOverlay({ attempts }: { attempts: number }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm select-none animate-fade-in">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute h-14 w-14 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
        <Loader2 className="h-6 w-6 text-violet-500 animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">
        Conexión inestable
      </h3>
      <p className="text-xs text-gray-300">
        Reconectando con el servidor (Intento {attempts})...
      </p>
    </div>
  )
}
