import { Mic, MicOff, User, Video, VideoOff } from 'lucide-react'
import { useParams } from 'react-router'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { DeviceSelect } from '../components/DeviceSelect'
import { LobbyParticipantsCarousel } from '../components/LobbyParticipantsCarousel'
import { MOCK_LOBBY_WAITING_PARTICIPANTS } from '../constants/mockLobbyParticipants'
import { createMockRoomSession } from '../constants/mockRoomSession'
import { useRoomLobby } from '../hooks/useRoomLobby'

function getRoomShortName(fullName: string): string {
  const dash = fullName.indexOf(' - ')
  return dash > 0 ? fullName.slice(0, dash) : fullName
}

export default function RoomLobbyPage() {
  const { id } = useParams()
  const roomId = id ?? ''

  const mockSession = createMockRoomSession(roomId, {
    id: 'local',
    displayName: 'Usuario',
  })
  const roomShortName = getRoomShortName(mockSession.roomName)

  const {
    localMedia,
    selectedMicId,
    selectedCameraId,
    micDevices,
    cameraDevices,
    toggleMic,
    toggleCamera,
    setSelectedMicId,
    setSelectedCameraId,
    joinRoom,
  } = useRoomLobby(roomId)

  useDocumentTitle(`Lobby - ${mockSession.roomName}`)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center animate-fade-in pb-16">
      <h1 className="mb-10 max-w-xl text-center text-lg font-semibold leading-snug text-auth-title sm:text-xl md:text-2xl">
        Estás a punto de entrar a la sala{' '}
        <span className="text-auth-btn">{roomShortName}</span>, comprueba que todo
        funcione
      </h1>

      <div className="mb-10 w-full">
        <LobbyParticipantsCarousel participants={MOCK_LOBBY_WAITING_PARTICIPANTS} />
      </div>

      <div
        className="
          relative mb-6 flex aspect-video w-full items-center justify-center
          overflow-hidden rounded-2xl border border-auth-input-border bg-auth-input-bg/80
        "
      >
        {localMedia.isCameraOn ? (
          <User
            className="h-20 w-20 text-auth-label/40 sm:h-24 sm:w-24"
            aria-hidden="true"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-auth-label">
            <VideoOff className="h-16 w-16 opacity-40" aria-hidden="true" />
            <p className="text-sm">Cámara desactivada</p>
          </div>
        )}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
          <button
            type="button"
            aria-label={localMedia.isMicOn ? 'Silenciar micrófono' : 'Activar micrófono'}
            onClick={toggleMic}
            className={`
              flex h-11 w-11 items-center justify-center rounded-full
              border border-auth-input-border/60 backdrop-blur-sm transition-all
              cursor-pointer active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
              ${
                localMedia.isMicOn
                  ? 'bg-auth-bg/70 text-auth-title hover:bg-auth-surface'
                  : 'bg-rose-400/20 text-rose-300 hover:bg-rose-400/30'
              }
            `}
          >
            {localMedia.isMicOn ? (
              <Mic className="h-5 w-5" aria-hidden="true" />
            ) : (
              <MicOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            aria-label={localMedia.isCameraOn ? 'Apagar cámara' : 'Encender cámara'}
            onClick={toggleCamera}
            className={`
              flex h-11 w-11 items-center justify-center rounded-full
              border border-auth-input-border/60 backdrop-blur-sm transition-all
              cursor-pointer active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
              ${
                localMedia.isCameraOn
                  ? 'bg-auth-bg/70 text-auth-title hover:bg-auth-surface'
                  : 'bg-auth-bg/70 text-auth-label hover:bg-auth-surface'
              }
            `}
          >
            {localMedia.isCameraOn ? (
              <Video className="h-5 w-5" aria-hidden="true" />
            ) : (
              <VideoOff className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="mb-8 flex w-full flex-col gap-4 sm:flex-row">
        <DeviceSelect
          label="Micrófono"
          value={selectedMicId}
          options={micDevices}
          onChange={setSelectedMicId}
        />
        <DeviceSelect
          label="Cámara"
          value={selectedCameraId}
          options={cameraDevices}
          onChange={setSelectedCameraId}
        />
      </div>

      <button
        type="button"
        onClick={joinRoom}
        className="
          w-full rounded-xl bg-auth-btn py-3.5 text-sm font-semibold text-auth-btn-text
          transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg
        "
      >
        Entrar a la sala
      </button>
    </div>
  )
}
