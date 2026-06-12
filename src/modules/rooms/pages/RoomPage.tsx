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
  const { session, actions } = useRoomSession(roomId, room?.roomCode)
  const [activePanel, setActivePanel] = useState<RoomSidebarPanel | null>('chat')
  const getIdToken = useAuthStore((s) => s.getIdToken)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

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

    async function loadMembers() {
      setLoadingMembers(true)
      try {
        const token = await getIdToken()
        const data = await getRoomMembers(token, roomId)
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

  return (
    <div className="flex h-full w-full">
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

          <div className="relative flex h-full shrink-0">
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
              members={members}
              onlineParticipants={session.participants}
              loadingMembers={loadingMembers}
              isOpen={activePanel === 'participants'}
            />

            <RoomSettingsPanel isOpen={activePanel === 'settings'} />

            {activePanel !== 'chat' && (
              <button
                type="button"
                onClick={() => setActivePanel('chat')}
                className="
                  absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 z-40
                  h-40 w-8 shrink-0 cursor-pointer
                  flex items-center justify-center 
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