import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/stores/useAuthStore'
import GoogleIcon from './GoogleIcon'

export default function GoogleSignInButton() {
  const navigate = useNavigate()
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  const error = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleGoogleSignIn = async () => {
    clearError()
    setIsSubmitting(true)
    try {
      await loginWithGoogle()
      navigate('/dashboard')
    } catch {
      // El mensaje queda en el store para mostrarlo en pantalla.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
        aria-label="Continuar con Google"
        className="flex w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span>Continuar con Google</span>
        <GoogleIcon className="h-5 w-5 shrink-0" />
      </button>

      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
