import type { ReactNode } from 'react'
import type { MediaPermissionStatus, MediaPermissionsState } from '../hooks/useMediaPermissions'

interface OnRetryProp {
  onRetry: () => void
}

interface OnCloseProp {
  onClose?: () => void
}


/** Overlay oscuro de fondo para modales */
function ModalBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {children}
    </div>
  )
}


function ModalCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`
        relative w-full max-w-md mx-4 rounded-2xl
        bg-white dark:bg-zinc-900
        border border-zinc-200 dark:border-zinc-700
        shadow-2xl p-6
        ${className}
      `}
    >
      {children}
    </div>
  )
}


function TopBanner({
  children,
  variant = 'warning',
}: {
  children: ReactNode
  variant?: 'warning' | 'error' | 'info' | 'success'
}) {
  const variantClasses = {
    warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200',
    error:   'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200',
    info:    'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/50 dark:border-green-800 dark:text-green-200',
  }

  return (
    <div
      className={`
        w-full border-b px-4 py-3
        flex items-center gap-3
        text-sm font-medium
        ${variantClasses[variant]}
      `}
      role="alert"
    >
      {children}
    </div>
  )
}

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin shrink-0"
      aria-hidden="true"
    >
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}


function Button({
  onClick,
  variant = 'primary',
  children,
  className = '',
}: {
  onClick: () => void
  variant?: 'primary' | 'secondary'
  children: ReactNode
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  const variants = {
    primary:   'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white focus-visible:ring-blue-500',
    secondary: 'border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 text-zinc-700 dark:text-zinc-300 focus-visible:ring-zinc-500',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}


export function RequestingPermissionsModal({
  status,
}: {
  status: 'requesting_permissions' | 'acquiring_media'
}) {
  const isRequesting = status === 'requesting_permissions'

  return (
    <ModalBackdrop>
      <ModalCard>
        {/* Ícono central */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
            {isRequesting ? (
              /* Ícono cámara */
              <svg
                width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"
                aria-hidden="true"
              >
                <path d="M23 7 16 12l7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            ) : (
              <Spinner size={28} />
            )}
          </div>
        </div>

        {/* Texto principal */}
        <h2 className="text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {isRequesting
            ? 'Permitir acceso a cámara y micrófono'
            : 'Iniciando dispositivos…'}
        </h2>
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          {isRequesting
            ? 'Tu navegador te pedirá permiso para usar la cámara y el micrófono. Haz clic en "Permitir" para continuar.'
            : 'Estamos configurando tu cámara y micrófono. Esto solo toma un momento.'}
        </p>

        {/* Indicador de paso */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <Spinner size={14} />
          <span>
            {isRequesting ? 'Esperando tu respuesta…' : 'Preparando stream de video…'}
          </span>
        </div>

        {/* Hint visual (solo en requesting) */}
        {isRequesting && (
          <div className="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <strong className="text-zinc-700 dark:text-zinc-300">¿No ves el prompt?</strong>{' '}
              Busca el ícono de cámara o candado en la barra de direcciones de tu navegador.
            </p>
          </div>
        )}
      </ModalCard>
    </ModalBackdrop>
  )
}

/**
 * Banner de error cuando el usuario rechazó los permisos.
 *
 * Estado: 'permission_denied'
 */
export function PermissionDeniedBanner({ onRetry }: OnRetryProp) {
  return (
    <TopBanner variant="error">
      {/* Ícono */}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className="shrink-0" aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>

      <div className="flex-1 min-w-0">
        <span className="font-semibold">Permisos bloqueados.</span>{' '}
        <span className="font-normal">
          Para usar cámara y micrófono, habilita los permisos en la barra de tu navegador (ícono de cámara o candado).
        </span>
      </div>

      <Button onClick={onRetry} variant="secondary" className="shrink-0 text-xs px-3 py-1.5">
        Reintentar
      </Button>
    </TopBanner>
  )
}


export function HardwareErrorBanner({ onRetry, message }: OnRetryProp & { message?: string | null }) {
  return (
    <TopBanner variant="error">
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className="shrink-0" aria-hidden="true"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>

      <div className="flex-1 min-w-0">
        <span className="font-semibold">Error de hardware.</span>{' '}
        <span className="font-normal">
          {message ?? 'No encontramos cámara o micrófono. Verifica que estén conectados y no estén en uso por otra app.'}
        </span>
      </div>

      <Button onClick={onRetry} variant="secondary" className="shrink-0 text-xs px-3 py-1.5">
        Reintentar
      </Button>
    </TopBanner>
  )
}

/**
 * Overlay semitransparente de reconexión sobre el VideoGrid.
 * No bloquea toda la UI — el usuario puede seguir viendo el chat.
 *
 * Estado: 'reconnecting'
 */
export function ReconnectingOverlay({ attempts }: { attempts: number }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-label="Reconectando…"
    >
      <div className="flex flex-col items-center gap-4 text-white">
        <Spinner size={36} />
        <div className="text-center">
          <p className="text-base font-semibold">Reconectando…</p>
          {attempts > 1 && (
            <p className="text-sm text-white/70 mt-1">
              Intento {attempts} — verifica tu conexión a internet
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


export function WebRtcErrorBanner({ onRetry, message }: OnRetryProp & { message?: string | null }) {
  return (
    <TopBanner variant="error">
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className="shrink-0" aria-hidden="true"
      >
        <path d="M1 6s4-2 11-2 11 2 11 2"/>
        <path d="M1 10s4-2 11-2 11 2 11 2"/>
        <line x1="1" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="18" x2="23" y2="18"/>
        <line x1="3" y1="2" x2="21" y2="22"/>
      </svg>

      <div className="flex-1 min-w-0">
        <span className="font-semibold">Sin conexión de video.</span>{' '}
        <span className="font-normal">
          {message ?? 'No se pudo establecer la conexión. Puedes seguir usando el chat de texto.'}
        </span>
      </div>

      <Button onClick={onRetry} variant="secondary" className="shrink-0 text-xs px-3 py-1.5">
        Reintentar
      </Button>
    </TopBanner>
  )
}


export function CameraOffPlaceholder({
  displayName,
  avatarUrl,
  size = 'md',
}: {
  displayName: string
  avatarUrl?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-24 h-24 text-3xl',
  }

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 gap-3"
      aria-label={`${displayName} — cámara desactivada`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={displayName}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-zinc-700`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-zinc-700 flex items-center justify-center font-semibold text-zinc-200 ring-2 ring-zinc-600`}
          aria-hidden="true"
        >
          {initials || '?'}
        </div>
      )}
      <span className="text-xs text-zinc-500 flex items-center gap-1.5">
        {/* Ícono cámara tachada */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          strokeLinejoin="round" aria-hidden="true"
        >
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34"/>
          <circle cx="12" cy="13" r="3" className="opacity-40"/>
        </svg>
        Cámara desactivada
      </span>
    </div>
  )
}

/**
 * Indicador visual de mute del micrófono.
 * Se superpone sobre el tile del participante en el VideoGrid.
 */
export function MicOffIndicator({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center w-7 h-7 rounded-full bg-red-600/90 ${className}`}
      aria-label="Micrófono silenciado"
      title="Micrófono silenciado"
    >
      <svg
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="white" strokeWidth="2.5" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true"
      >
        <line x1="1" y1="1" x2="23" y2="23"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
        <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 1-.2 1.97-.54 2.84"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </div>
  )
}

export function MediaStatusGate({
  mediaState,
  onRetry,
  children,
}: {
  mediaState: MediaPermissionsState
  onRetry: () => void
  children: ReactNode
}) {
  const { status, reconnectAttempts, errorMessage } = mediaState

  const isBlockingModal =
    status === 'requesting_permissions' || status === 'acquiring_media'

  const isTopBanner =
    status === 'permission_denied' ||
    status === 'hardware_error' ||
    status === 'webrtc_error'

  return (
    <>
      {/* Banners de error en la parte superior (no bloquean el layout) */}
      {isTopBanner && (
        <div className="w-full">
          {status === 'permission_denied' && (
            <PermissionDeniedBanner onRetry={onRetry} />
          )}
          {status === 'hardware_error' && (
            <HardwareErrorBanner onRetry={onRetry} message={errorMessage} />
          )}
          {status === 'webrtc_error' && (
            <WebRtcErrorBanner onRetry={onRetry} message={errorMessage} />
          )}
        </div>
      )}

      {/* Contenido principal */}
      <div className="relative flex-1 min-h-0">
        {children}

        {/* Overlay de reconexión (se superpone sobre el video, no bloquea el chat) */}
        {status === 'reconnecting' && (
          <ReconnectingOverlay attempts={reconnectAttempts} />
        )}
      </div>

      {/* Modal bloqueante solo para solicitud de permisos */}
      {isBlockingModal && (
        <RequestingPermissionsModal
          status={status as 'requesting_permissions' | 'acquiring_media'}
        />
      )}
    </>
  )
}

// Re-exportar el tipo para que RoomPage pueda importar todo desde aquí
export type { MediaPermissionStatus, MediaPermissionsState }