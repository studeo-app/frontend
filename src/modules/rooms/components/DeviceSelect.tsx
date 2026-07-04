import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import type { MediaDeviceOption } from '../types/lobby'

interface DeviceSelectProps {
  label: string
  value: string
  options: MediaDeviceOption[]
  onChange: (deviceId: string) => void
}

export function DeviceSelect({ label, value, options, onChange }: DeviceSelectProps) {
  const selectId = useId()

  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={selectId}
        className="mb-2 block font-auth text-xs font-medium uppercase tracking-widest text-auth-label"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full appearance-none rounded-xl border border-auth-input-border
            bg-auth-input-bg px-4 py-3.5 pr-10 text-sm text-auth-title sm:py-3
            transition-colors hover:border-auth-btn/30
            focus:border-auth-btn focus:outline-none focus:ring-1 focus:ring-auth-btn
            cursor-pointer
          "
        >
          {options.map((opt) => (
            <option key={opt.deviceId} value={opt.deviceId}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-auth-label"
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
