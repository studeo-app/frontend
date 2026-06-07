import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { ChatPanel } from '../components/ChatPanel'
import { ControlBar } from '../components/ControlBar'
import { ParticipantsPanel } from '../components/ParticipantsPanel'
import { RoomHeader } from '../components/RoomHeader'
import { RoomSettingsPanel } from '../components/RoomSettingsPanel'
import { RoomSidebar } from '../components/RoomSidebar'
import { VideoGrid } from '../components/VideoGrid'
import { useRoom } from '../hooks/useRoom'
import { useRoomSession } from '../hooks/useRoomSession'
import type { RoomSidebarPanel } from '../types/roomSession'

export default function RoomPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roomId = id ?? ''
  const firebaseUser = useAuthStore((s) => s.user)

  const { room, setRoom } = useRoom(roomId)
  const { session, actions } = useRoomSession(roomId)
  const [activePanel, setActivePanel] = useState<RoomSidebarPanel>('chat')

  const roomName = room?.name ?? session.roomName
  const isOwner = room?.ownerUid === firebaseUser?.uid

  useDocumentTitle(`${roomName} - Studeo`)

  const renderSidePanel = () => {
    switch (activePanel) {
      case 'participants':
        return <ParticipantsPanel participants={session.participants} />
      case 'settings':
        return <RoomSettingsPanel />
      case 'chat':
      default:
        return (
          <ChatPanel
            messages={session.messages}
            onSendMessage={actions.sendMessage}
          />
        )
    }
  }

  return (
    <div className="flex h-full w-full">
      <RoomSidebar
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        chatHasUnread={false}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <RoomHeader
          roomName={roomName}
          participantCount={session.participants.length}
          roomCode={session.roomCode}
          room={room}
          isOwner={isOwner}
          onRoomUpdated={setRoom}
          onRoomDeleted={() => navigate('/dashboard')}
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

          <div className="hidden sm:flex">{renderSidePanel()}</div>
        </div>
      </div>
    </div>
  )
}
