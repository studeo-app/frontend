import { ArrowLeft, Mic, MicOff, User, Video, VideoOff } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { DeviceSelect } from '../components/DeviceSelect'
import { LobbyParticipantsCarousel } from '../components/LobbyParticipantsCarousel'
import { useRoom } from '../hooks/useRoom'
import { useRoomLobby } from '../hooks/useRoomLobby'

function getRoomShortName(fullName: string): string {
  const dash = fullName.indexOf(' - ')
  return dash > 0 ? fullName.slice(0, dash) : fullName
}

export default function RoomLobbyPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const roomId = id ?? ''
  const { room, loading: loadingRoom } = useRoom(roomId)
  const roomName = room?.name ?? 'Sala'
  const roomShortName = getRoomShortName(roomName)

  const {
    localMedia,
    selectedMicId,
    selectedCameraId,
    micDevices,
    cameraDevices,
    waitingParticipants,
    loadingParticipants,
    previewError,
    toggleMic,
    toggleCamera,
    setSelectedMicId,
    setSelectedCameraId,
    joinRoom,
  } = useRoomLobby(roomId)

  useDocumentTitle(`Lobby - ${roomName}`)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl md:max-w-4xl lg:max-w-5xl flex-col items-center justify-center overflow-y-auto px-4 py-4 animate-fade-in sm:px-6 sm:py-6">
      {/* Cabecera / Navegación */}
      <div className="relative flex w-full items-center justify-center mb-3 sm:mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-xl border border-auth-input-border/60 bg-auth-input-bg/50 text-auth-label hover:border-auth-btn/40 hover:text-auth-title transition active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
          aria-label="Volver al panel"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="mx-12 text-center text-base font-semibold leading-snug text-auth-title sm:text-lg md:text-xl lg:text-2xl">
          Estás a punto de entrar a la sala{' '}
          <span className="text-auth-btn">{loadingRoom ? '...' : roomShortName}</span>,
          comprueba que todo funcione
        </h1>
      </div>

      {/* COMPACTADO: Bajamos el margen de mb-10 a mb-6 */}
      <div className="mb-3 w-full sm:mb-4">
        {loadingParticipants ? (
          <div className="rounded-2xl border border-auth-input-border bg-auth-surface px-5 py-6 text-center text-sm text-auth-label">
            Cargando participantes conectados...
          </div>
        ) : previewError ? (
          <div className="rounded-2xl border border-auth-error/20 bg-auth-error/5 px-5 py-5 text-center text-sm text-auth-error">
            {previewError}
          </div>
        ) : (
          <LobbyParticipantsCarousel participants={waitingParticipants} />
        )}
      </div>

      {/* COMPACTADO: Agrandamos el max-h de la cámara aprovechando la reducción de márgenes */}
      <div
        className="
          relative mb-3 flex aspect-video w-full max-h-[200px] sm:max-h-[260px] md:max-h-[340px] lg:max-h-[400px] min-h-[170px] items-center justify-center
          overflow-hidden rounded-xl border border-auth-input-border bg-auth-input-bg/80 sm:mb-4 sm:rounded-2xl
        "
      >
        {localMedia.isCameraOn ? (
          <User
            className="h-16 w-16 text-auth-label/40 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28"
            aria-hidden="true"
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-auth-label">
            <VideoOff className="h-12 w-12 sm:h-14 sm:w-14 md:h-18 md:w-18 lg:h-20 lg:w-20 opacity-40" aria-hidden="true" />
            <p className="text-xs sm:text-sm md:text-base">Cámara desactivada</p>
          </div>
        )}

        {/* COMPACTADO: Subimos levemente los botones con bottom-3 y h-10 para limpiar espacio */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2.5">
          <button
            type="button"
            aria-label={localMedia.isMicOn ? 'Silenciar micrófono' : 'Activar micrófono'}
            onClick={toggleMic}
            className={`
              flex h-10 w-10 items-center justify-center rounded-full sm:h-10 sm:w-10
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
              <Mic className="h-4 w-4" aria-hidden="true" />
            ) : (
              <MicOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            aria-label={localMedia.isCameraOn ? 'Apagar cámara' : 'Encender cámara'}
            onClick={toggleCamera}
            className={`
              flex h-10 w-10 items-center justify-center rounded-full sm:h-10 sm:w-10
              border border-auth-input-border/60 backdrop-blur-sm transition-all
              cursor-pointer active:scale-95
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
              ${
                localMedia.isCameraOn
                  ? 'bg-auth-bg/70 text-auth-title hover:bg-auth-surface'
                  : 'bg-rose-400/20 text-rose-300 hover:bg-rose-400/30'
              }
            `}
          >
            {localMedia.isCameraOn ? (
              <Video className="h-4 w-4" aria-hidden="true" />
            ) : (
              <VideoOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* COMPACTADO: Bajamos de mb-8 a mb-5 y redujimos gap entre selectores */}
      <div className="mb-3 flex w-full flex-col gap-3 sm:mb-4 sm:flex-row">
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
          w-full rounded-xl bg-auth-btn py-3.5 text-sm font-semibold text-auth-btn-text sm:py-3 md:py-4 md:text-base lg:py-4.5 lg:text-lg
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
