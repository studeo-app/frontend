import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
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
import type { RoomSidebarPanel } from '../types/roomSession'
import type { RoomMember } from '@/types/room'

export default function RoomPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roomId = id ?? ''
  const firebaseUser = useAuthStore((s) => s.user)

  const { room, setRoom } = useRoom(roomId)
  const { session, actions } = useRoomSession(roomId)
  const [activePanel, setActivePanel] = useState<RoomSidebarPanel>('chat')
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // ── Indicador de mensajes no leídos ───────────────────────────────
  const [chatHasUnread, setChatHasUnread] = useState(false)
  const prevMsgCountRef = useRef(session.messages.length)

  useEffect(() => {
    // Si llegan mensajes nuevos y el panel de chat no está activo → marcar como no leído
    if (
      session.messages.length > prevMsgCountRef.current &&
      activePanel !== 'chat'
    ) {
      setChatHasUnread(true)
    }
    prevMsgCountRef.current = session.messages.length
  }, [session.messages.length, activePanel])

  // Limpiar badge al abrir el panel de chat
  useEffect(() => {
    if (activePanel === 'chat') {
      setChatHasUnread(false)
    }
  }, [activePanel])

  useEffect(() => {
    if (!roomId) return
    let cancelled = false

    async function loadMembers() {
      console.log('[RoomMembers] load:start', { roomId })
      setLoadingMembers(true)
      try {
        const token = await getIdToken()
        console.log('[RoomMembers] token:ok', { roomId })
        const data = await getRoomMembers(token, roomId)
        console.log('[RoomMembers] load:success', {
          roomId,
          count: data.length,
          members: data.map((member) => ({
            uid: member.uid,
            displayName: member.displayName,
          })),
        })
        if (!cancelled) {
          setMembers(data)
        }
      } catch (err) {
        console.error('[RoomMembers] load:error', { roomId, err })
        if (!cancelled) {
          setMembers([])
        }
      } finally {
        if (!cancelled) {
          console.log('[RoomMembers] load:finally', { roomId })
          setLoadingMembers(false)
        }
      }
    }

    loadMembers()

    return () => {
      cancelled = true
    }
  }, [roomId, getIdToken])

  const roomName = room?.name ?? session.roomName
  const isOwner = room?.ownerUid === firebaseUser?.uid

  useDocumentTitle(`${roomName} - Studeo`)

  const renderSidePanel = () => {
    switch (activePanel) {
      case 'participants':
        return (
          <ParticipantsPanel
            members={members}
            onlineParticipants={session.participants}
            loadingMembers={loadingMembers}
          />
        )
      case 'settings':
        return <RoomSettingsPanel />
      case 'chat':
      default:
        return (
          <ChatPanel
            messages={session.messages}
            currentUserId={firebaseUser?.uid}
            onSendMessage={actions.sendMessage}
            loadingHistory={session.loadingHistory}
            hasMoreHistory={session.hasMoreHistory}
            onLoadMore={actions.loadMoreHistory}
          />
        )
    }
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <RoomHeader
          roomName={roomName}
          participantCount={session.participants.length}
          roomCode={room?.id ?? session.roomId}
          room={room}
          isOwner={isOwner}
          onRoomUpdated={setRoom}
          onRoomDeleted={() => navigate('/dashboard')}
          activePanel={activePanel}
          chatHasUnread={chatHasUnread}
          onPanelChange={setActivePanel}
        />

        <div className="flex min-h-0 flex-1">
          <div className="relative flex min-w-0 flex-1 flex-col">
            <VideoGrid participants={session.participants} />
            <ControlBar
              media={session.localMedia}
              onToggleMic={actions.toggleMic}
              onToggleCamera={actions.toggleCamera}
              onToggleScreenShare={actions.toggleScreenShare}
              onLeave={actions.leaveRoom}
            />
          </div>

          {activePanel && (
            <div className="flex w-full shrink-0 sm:w-[300px] lg:w-[320px]">
              {renderSidePanel()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
