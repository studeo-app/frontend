import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface RoomHeaderProps {
  roomName: string
  participantCount: number
  roomCode: string
}

export function RoomHeader({
  roomName,
  participantCount,
  roomCode,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-auth-input-border px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-4">
        <h1 className="truncate text-sm font-medium text-auth-title sm:text-base">
          {roomName}
        </h1>
        <span className="hidden shrink-0 rounded-full bg-auth-link px-3 py-1 text-xs font-semibold text-auth-bg sm:inline-block">
          {participantCount} participante{participantCount !== 1 ? 's' : ''}
        </span>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        title="Copiar ID de sala"
        className="
          flex shrink-0 items-center gap-2 rounded-xl border border-auth-input-border
          bg-auth-input-bg/50 px-3 py-1.5 font-auth text-xs text-auth-label
          transition-colors hover:border-auth-btn/40 hover:text-auth-title
          cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
        "
      >
        <span>ID: {roomCode}</span>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-auth-link" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </button>
    </header>
  )
}
