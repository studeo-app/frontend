import { ArrowLeft, Headphones, Loader2, Mic, MicOff, User, Video, VideoOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
    localStream,
    selectedMicId,
    selectedCameraId,
    micDevices,
    cameraDevices,
    waitingParticipants,
    loadingParticipants,
    previewError,
    mediaError,
    micMonitoring,
    toggleMic,
    toggleCamera,
    toggleMicMonitoring,
    setSelectedMicId,
    setSelectedCameraId,
    joinRoom,
  } = useRoomLobby(roomId)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const [isJoiningRoom, setIsJoiningRoom] = useState(false)

  const isLobbyLoading = loadingRoom || loadingParticipants
  const isJoinDisabled = isLobbyLoading || isJoiningRoom

  useDocumentTitle(`Lobby - ${roomName}`)

  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  const handleJoinRoom = () => {
    if (isJoinDisabled) return
    setIsJoiningRoom(true)
    joinRoom()
  }

  return (
    <div className="mx-auto flex h-dvh min-h-0 w-full max-w-2xl flex-col items-center justify-start overflow-y-auto overscroll-contain px-4 py-4 animate-fade-in sm:px-6 sm:py-6 md:max-w-4xl">
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

      {/* Camera preview — object-contain, strict 16:9, aligned with controls below */}
      <div
        className="
          relative mb-3 w-full items-center justify-center
          overflow-hidden rounded-xl border border-auth-input-border bg-black sm:mb-4 sm:rounded-2xl
        "
        style={{ aspectRatio: '16 / 9' }}
      >
        {localMedia.isCameraOn && localStream ? (
          <video
            ref={previewVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : localMedia.isCameraOn ? (
          <div className="absolute inset-0 flex items-center justify-center bg-auth-input-bg/80">
            <User
              className="h-16 w-16 text-auth-label/40 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28"
              aria-hidden="true"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-auth-input-bg/80 text-auth-label">
            <VideoOff className="h-12 w-12 sm:h-14 sm:w-14 md:h-18 md:w-18 lg:h-20 lg:w-20 opacity-40" aria-hidden="true" />
            <p className="text-xs sm:text-sm md:text-base">Cámara desactivada</p>
          </div>
        )}

        {mediaError && (
          <div className="absolute left-3 right-3 top-3 rounded-xl border border-auth-error/20 bg-auth-bg/85 px-3 py-2 text-center text-xs text-auth-error backdrop-blur-sm">
            {mediaError}
          </div>
        )}

        {/* Controls: mic, camera, and monitoring */}
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2.5">
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

          {/* Mic monitoring button — only useful when mic is on */}
          {localMedia.isMicOn && (
            <div className="group relative">
              <button
                type="button"
                aria-label={micMonitoring ? 'Dejar de escucharme' : 'Escucharme (requiere audífonos)'}
                onClick={toggleMicMonitoring}
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  border backdrop-blur-sm transition-all
                  cursor-pointer active:scale-95
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
                  ${
                    micMonitoring
                      ? 'border-violet-500/60 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                      : 'border-auth-input-border/60 bg-auth-bg/70 text-auth-label hover:bg-auth-surface hover:text-auth-title'
                  }
                `}
              >
                <Headphones className="h-4 w-4" aria-hidden="true" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-auth-input-border bg-auth-bg/95 px-2.5 py-1.5 text-center text-xs text-auth-label opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100">
                {micMonitoring ? 'Escuchándote · clic para desactivar' : 'Escucharme'}
                {!micMonitoring && (
                  <span className="mt-0.5 block text-xs text-amber-700 font-medium">⚠ Usa audífonos para evitar eco</span>
                )}
              </div>
            </div>
          )}
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
        onClick={handleJoinRoom}
        disabled={isJoinDisabled}
        aria-busy={isLobbyLoading || isJoiningRoom}
        className="
          w-full rounded-xl bg-auth-btn py-3.5 text-sm font-semibold text-auth-btn-text sm:py-3 md:py-4 md:text-base lg:py-4.5 lg:text-lg
          inline-flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:pointer-events-none disabled:opacity-60
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
          focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg
        "
      >
        {(isLobbyLoading || isJoiningRoom) && (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        )}
        {isLobbyLoading || isJoiningRoom ? 'Cargando...' : 'Entrar a la sala'}
      </button>
    </div>
  )
}
