import { Link } from 'react-router'
import GoogleSignInButton from '@/modules/auth/components/GoogleSignInButton'
import useDocumentTitle from '@/shared/hooks/useDocumentTitle'

export default function LoginPage() {
  useDocumentTitle('Login')

  return (
    <section className="space-y-8">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Login</h1>
        <p className="mt-2 text-sm text-primary-foreground/90">
          Inicia sesión en Studeo para acceder al dashboard.
        </p>
      </header>

      <article className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
          }}
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Login
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            o
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        <GoogleSignInButton />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link
            to="/register"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Regístrate
          </Link>
        </p>
      </article>
    </section>
  )
}
