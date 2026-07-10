import { useState } from 'react'
import { Captions, Camera, ChevronRight, CircleHelp, FlipHorizontal, Loader2, Volume2 } from 'lucide-react'
import { BaseModal } from '@/shared/components/ui/BaseModal'
import type { LocalCaptionsState } from '../types/roomSession'

interface RoomSettingsPanelProps {
  isOpen?: boolean
  outputVolume: number
  mirrorLocalVideo: boolean
  cameraFacingMode: 'user' | 'environment'
  localCaptions: LocalCaptionsState
  onOutputVolumeChange: (volume: number) => void
  onToggleMirrorLocalVideo: () => void
  onSwitchCamera: () => void
  onToggleLocalCaptions: () => void
  onClose?: () => void 
}

const isMobileDevice =
  typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export function RoomSettingsPanel({
  isOpen = true,
  outputVolume,
  mirrorLocalVideo,
  cameraFacingMode,
  localCaptions,
  onOutputVolumeChange,
  onToggleMirrorLocalVideo,
  onSwitchCamera,
  onToggleLocalCaptions,
  onClose, 
}: RoomSettingsPanelProps) {
  const [isCaptionHelpOpen, setIsCaptionHelpOpen] = useState(false)
  const isCaptionsBusy = localCaptions.status === 'loading'
  const captionsStatusLabel =
    isCaptionsBusy
      ? 'Cargando...'
      : localCaptions.status === 'unsupported'
        ? 'No disponible en este navegador'
        : localCaptions.status === 'error'
          ? 'No se pudo activar'
          : null

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
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-auth-label">Accesibilidad</p>
              {!isMobileDevice && (
                <button
                  type="button"
                  onClick={() => setIsCaptionHelpOpen(true)}
                  className="rounded-full p-1 text-auth-label transition hover:bg-auth-input-bg hover:text-auth-title"
                  aria-label="Cómo funcionan los subtítulos"
                  title="Cómo funcionan los subtítulos"
                >
                  <CircleHelp className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {!isMobileDevice ? (
              <button
                type="button"
                onClick={onToggleLocalCaptions}
                aria-label={localCaptions.enabled ? 'Desactivar subtítulos' : 'Activar subtítulos'}
                aria-pressed={localCaptions.enabled}
                aria-describedby={captionsStatusLabel ? 'local-captions-status' : undefined}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-auth-input-border bg-auth-input-bg px-3 py-2.5 text-left transition hover:border-auth-btn/40"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm text-auth-title">
                  <Captions className="h-4 w-4 shrink-0 text-auth-label" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate">Subtítulos</span>
                    {captionsStatusLabel && (
                      <span id="local-captions-status" className="mt-0.5 block truncate text-[11px] text-auth-label">
                        {captionsStatusLabel}
                      </span>
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {isCaptionsBusy && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-auth-btn" aria-hidden="true" />
                  )}
                  <span
                    className={`
                      relative h-6 w-11 rounded-full transition
                      ${localCaptions.enabled ? 'bg-auth-btn' : 'bg-auth-input-border'}
                    `}
                    aria-hidden="true"
                  >
                    <span
                      className={`
                        absolute top-1 h-4 w-4 rounded-full bg-white transition
                        ${localCaptions.enabled ? 'left-6' : 'left-1'}
                      `}
                    />
                  </span>
                </span>
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-auth-input-border bg-auth-input-bg/70 px-3 py-3 text-sm text-auth-label">
                Los subtítulos locales no están disponibles en celulares para evitar fallos de audio y rendimiento.
              </div>
            )}
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

      <BaseModal
        isOpen={isCaptionHelpOpen}
        onClose={() => setIsCaptionHelpOpen(false)}
        title="Cómo funcionan los subtítulos"
      >
        <div className="space-y-3 text-sm leading-relaxed text-auth-label">
          <p>
            Cuando activas los subtítulos, tu voz se convierte en texto para que todos en la sala puedan seguir la conversación con más comodidad.
          </p>
          <ul className="space-y-2 rounded-xl border border-auth-input-border bg-auth-input-bg/70 p-3 text-sm">
            <li>• Quien los activa puede generar subtítulos para toda la llamada.</li>
            <li>• Todos los participantes verán el texto sobre la tarjeta del usuario que está hablando.</li>
            <li>• Puedes desactivarlos en cualquier momento si prefieres una llamada más sencilla.</li>
          </ul>
          <div className="rounded-xl border border-auth-btn/20 bg-auth-btn/10 p-3 text-sm text-auth-title">
            <p className="font-semibold">Consejo</p>
            <p className="mt-1">Habla con un ritmo claro y mantén el micrófono activado para que los subtítulos salgan mejor.</p>
          </div>
        </div>
      </BaseModal>
    </div>
  )
}
