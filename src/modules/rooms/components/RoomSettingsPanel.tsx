import { Camera, FlipHorizontal, Volume2, ChevronRight } from 'lucide-react'

interface RoomSettingsPanelProps {
  isOpen?: boolean
  outputVolume: number
  mirrorLocalVideo: boolean
  cameraFacingMode: 'user' | 'environment'
  onOutputVolumeChange: (volume: number) => void
  onToggleMirrorLocalVideo: () => void
  onSwitchCamera: () => void
  onClose?: () => void 
}

const isMobileDevice =
  typeof navigator !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)

export function RoomSettingsPanel({
  isOpen = true,
  outputVolume,
  mirrorLocalVideo,
  cameraFacingMode,
  onOutputVolumeChange,
  onToggleMirrorLocalVideo,
  onSwitchCamera,
  onClose, 
}: RoomSettingsPanelProps) {
  return (
    <div
      className={`
        pointer-events-auto fixed inset-x-3 bottom-[92px] top-[74px] z-40 flex h-auto shrink-0 overflow-hidden
        rounded-2xl shadow-2xl transition-all duration-300 ease-in-out
        md:static md:h-full md:rounded-none md:shadow-none
        ${isOpen ? 'translate-y-0 opacity-100 md:w-[320px]' : 'pointer-events-none translate-y-4 opacity-0 md:w-0 md:translate-y-0'}
      `}
    >
      <aside
        aria-label="Ajustes de sala"
        className="flex h-full w-full shrink-0 flex-col border border-auth-input-border bg-auth-surface md:w-[320px] md:border-y-0 md:border-r-0"
      >
        <div className="flex items-center justify-between border-b border-auth-input-border px-4 py-3">
          <h2 className="text-sm font-semibold text-auth-title">Ajustes</h2>
          <button
            type="button"
            onClick={onClose} // 👑 Dispara el cierre del panel lateral
            aria-label="Esconder ajustes"
            title="Esconder ajustes"
            className="rounded-lg p-1 text-auth-label transition-colors hover:bg-auth-input-bg hover:text-auth-title cursor-pointer shrink-0"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-medium text-auth-label">
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                Volumen general
              </p>
              <span className="text-xs font-medium tabular-nums text-auth-label">
                {outputVolume}%
              </span>
            </div>
            <input
              aria-label="Volumen general"
              type="range"
              min={0}
              max={100}
              value={outputVolume}
              onChange={(event) => onOutputVolumeChange(Number(event.target.value))}
              className="w-full accent-auth-btn"
            />
          </section>

          <section className="space-y-3">
            <p className="text-xs font-medium text-auth-label">Video</p>

            <button
              type="button"
              onClick={onToggleMirrorLocalVideo}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-auth-input-border bg-auth-input-bg px-3 py-2.5 text-left transition hover:border-auth-btn/40"
            >
              <span className="flex items-center gap-2 text-sm text-auth-title">
                <FlipHorizontal className="h-4 w-4 text-auth-label" aria-hidden="true" />
                Reflejar mi video
              </span>
              <span
                className={`
                  relative h-6 w-11 rounded-full transition
                  ${mirrorLocalVideo ? 'bg-auth-btn' : 'bg-auth-input-border'}
                `}
                aria-hidden="true"
              >
                <span
                  className={`
                    absolute top-1 h-4 w-4 rounded-full bg-white transition
                    ${mirrorLocalVideo ? 'left-6' : 'left-1'}
                  `}
                />
              </span>
            </button>

            {/* Solo visible en móvil: los laptops/desktop no tienen cámara frontal/trasera */}
            {isMobileDevice && (
              <button
                type="button"
                onClick={onSwitchCamera}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-auth-input-border bg-auth-input-bg px-3 py-2.5 text-left text-sm text-auth-title transition hover:border-auth-btn/40"
              >
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-auth-label" aria-hidden="true" />
                  Cambiar cámara
                </span>
                <span className="rounded-lg bg-auth-surface px-2 py-1 text-xs font-medium text-auth-label">
                  {cameraFacingMode === 'user' ? 'Frontal' : 'Trasera'}
                </span>
              </button>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}