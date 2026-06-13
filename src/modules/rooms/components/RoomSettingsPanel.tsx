import { Volume2 } from 'lucide-react'

interface RoomSettingsPanelProps {
  isOpen?: boolean
}

export function RoomSettingsPanel({ isOpen = true }: RoomSettingsPanelProps) {
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
        <div className="border-b border-auth-input-border px-4 py-3.5">
          <h2 className="text-sm font-semibold text-auth-title">Ajustes</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section>
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-auth-label">
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Volumen general
            </p>
            <input
              aria-label="Volumen general"
              type="range"
              min={0}
              max={100}
              defaultValue={80}
              className="w-full accent-auth-btn"
            />
          </section>

          <section>
            <p className="mb-2 text-xs font-medium text-auth-label">Dispositivos</p>
            <p className="font-auth text-xs text-auth-label/80">
              La selección de micrófono y cámara se conectará al backend realtime.
            </p>
          </section>
        </div>
      </aside>
    </div>
  )
}
