import { Volume2 } from 'lucide-react'

interface RoomSettingsPanelProps {
  isOpen?: boolean
}

export function RoomSettingsPanel({ isOpen = true }: RoomSettingsPanelProps) {
  return (
    <div
      className={`
        h-full shrink-0 flex transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-[320px] opacity-100' : 'w-0 opacity-0'}
      `}
    >
      <aside
        aria-label="Ajustes de sala"
        className="flex h-full w-[320px] shrink-0 flex-col border-l border-auth-input-border bg-auth-surface"
      >
        <div className="border-b border-auth-input-border px-4 py-3.5">
          <h2 className="text-sm font-semibold text-auth-title">Ajustes</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-auth-label">
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Volumen general
            </label>
            <input
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