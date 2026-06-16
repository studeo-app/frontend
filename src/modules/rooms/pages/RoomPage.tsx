import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AlertCircle, CameraOff, Loader2, RefreshCw, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { getSocket } from '@/config/socket.config'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { WarningModal } from '@/shared/components/ui/WarningModal'
import { getRoomMembers } from '../api/roomsApi'
import { ChatPanel } from '../components/ChatPanel'
import { ControlBar } from '../components/ControlBar'
import { ParticipantsPanel } from '../components/ParticipantsPanel'
import { RoomHeader } from '../components/RoomHeader'
import { RoomSettingsPanel } from '../components/RoomSettingsPanel'
import { VideoGrid } from '../components/VideoGrid'
import { useRoom } from '../hooks/useRoom'
import { useRoomSession } from '../hooks/useRoomSession'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'
import type { RoomSidebarPanel } from '../types/roomSession'
import type { RoomMember } from '@/types/room'

export type RoomMediaStatus =
  | 'requesting_permissions'
  | 'webrtc_connecting'
  | 'av_active'
  | 'no_camera'
  | 'no_mic'
  | 'reconnecting'
  | 'error_permissions'
  | 'error_hardware'
  | 'error_webrtc'

export default function RoomPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roomId = id ?? ''
  const firebaseUser = useAuthStore((s) => s.user)

  const { room, setRoom } = useRoom(roomId)
  const { session, actions, joinWarningMessage, clearJoinWarning, mediaError } = useRoomSession(
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

  // Overlay de reconexión: se activa solo cuando el socket se desconecta, DESPUÉS de haber estado conectado (no al cargar por primera vez)
  const hasBeenConnectedRef = useRef(false)
  const [showReconnecting, setShowReconnecting] = useState(false)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const mediaStatus = useMemo<RoomMediaStatus>(() => {
    if (showReconnecting) return 'reconnecting'
    
    if (mediaError === 'permissions') return 'error_permissions'
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

  const [chatHasUnread, setChatHasUnread] = useState(false)
  const prevMsgCountRef = useRef(session.messages.length)

  useEffect(() => {
    if (session.messages.length > prevMsgCountRef.current && activePanel !== 'chat') {
      setChatHasUnread(true)
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
      setRemovedMemberUids((prev) => new Set(prev).add(payload.uid))
      setMembers((prev) => prev.filter((member) => member.uid !== payload.uid))
    }
    socket.on(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleRoomMemberRemoved)
    return () => { socket.off(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleRoomMemberRemoved) }
  }, [roomId, session.connectionStatus])

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

  useDocumentTitle(`${roomName} - Studeo`)

  const handleJoinWarningClose = () => {
    clearJoinWarning()
    navigate('/dashboard')
  }

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

            {(mediaStatus === 'error_permissions' || mediaStatus === 'error_hardware' || mediaStatus === 'error_webrtc') && (
              <div className="flex flex-1 flex-col items-center justify-center bg-auth-bg text-center p-6 select-none animate-fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-6 shadow-lg shadow-red-500/5">
                  {mediaStatus === 'error_permissions' && <ShieldAlert className="h-8 w-8" />}
                  {mediaStatus === 'error_hardware' && <CameraOff className="h-8 w-8" />}
                  {mediaStatus === 'error_webrtc' && <AlertCircle className="h-8 w-8" />}
                </div>
                <h3 className="text-xl font-bold text-auth-title mb-2">
                  {mediaStatus === 'error_permissions' && 'Permisos denegados'}
                  {mediaStatus === 'error_hardware' && 'Error de hardware'}
                  {mediaStatus === 'error_webrtc' && 'Conexión fallida'}
                </h3>
                <p className="text-sm text-auth-label max-w-md mb-6 leading-relaxed">
                  {mediaStatus === 'error_permissions' &&
                    'No podemos iniciar la videollamada sin acceso a tus dispositivos. Asegúrate de habilitar los permisos de cámara y micrófono en la barra de direcciones y haz clic en Reintentar.'}
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
              mediaStatus !== 'error_permissions' &&
              mediaStatus !== 'error_hardware' &&
              mediaStatus !== 'error_webrtc' && (
                <VideoGrid
                  participants={session.participants}
                  mirrorLocalVideo={session.mirrorLocalVideo}
                  outputVolume={session.outputVolume}
                />
              )}

            {/* Overlay de reconexión: solo aparece si el socket se cae después de conectar */}
            {showReconnecting && (
              <ReconnectingOverlay attempts={reconnectAttempts} />
            )}

            <ControlBar
              media={session.localMedia}
              onToggleMic={actions.toggleMic}
              onToggleCamera={actions.toggleCamera}
              onToggleScreenShare={actions.toggleScreenShare}
              onLeave={actions.leaveRoom}
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

      <WarningModal
        isOpen={Boolean(joinWarningMessage)}
        onClose={handleJoinWarningClose}
        message={
          joinWarningMessage ??
          'Ya te encuentras conectado a esta sala desde otra pestaña o dispositivo.'
        }
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