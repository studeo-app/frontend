import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { getSocket } from '@/config/socket.config'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
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

export default function RoomPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roomId = id ?? ''
  const firebaseUser = useAuthStore((s) => s.user)

  const { room, setRoom } = useRoom(roomId)
  const { session, actions } = useRoomSession(roomId, room?.roomCode)
  const [activePanel, setActivePanel] = useState<RoomSidebarPanel | null>(() => {
    if (typeof window === 'undefined') return 'chat'
    return window.innerWidth >= 768 ? 'chat' : null
  })
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [removedMemberUids, setRemovedMemberUids] = useState<Set<string>>(() => new Set())

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

  // ── Indicador de mensajes no leídos ───────────────────────────────
  const [chatHasUnread, setChatHasUnread] = useState(false)
  const prevMsgCountRef = useRef(session.messages.length)

  useEffect(() => {
    if (
      session.messages.length > prevMsgCountRef.current &&
      activePanel !== 'chat'
    ) {
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
        if (!cancelled) {
          setLoadingMembers(false)
        }
      } catch {
        if (!cancelled) {
          setLoadingMembers(false)
        }
      }
    }

    loadInitialMembers()

    return () => {
      cancelled = true
    }
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

    return () => {
      socket.off(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, handleRoomMemberRemoved)
    }
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
            <VideoGrid
              participants={session.participants}
              mirrorLocalVideo={session.mirrorLocalVideo}
              outputVolume={session.outputVolume}
            />
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
            {/* Los 3 paneles siempre montados, la animación la maneja isOpen */}
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
            />

            <RoomSettingsPanel
              isOpen={activePanel === 'settings'}
              outputVolume={session.outputVolume}
              mirrorLocalVideo={session.mirrorLocalVideo}
              cameraFacingMode={session.cameraFacingMode}
              onOutputVolumeChange={actions.setOutputVolume}
              onToggleMirrorLocalVideo={actions.toggleMirrorLocalVideo}
              onSwitchCamera={actions.switchCamera}
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
    </div>
  )
}
