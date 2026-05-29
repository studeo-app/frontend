import ThemeToggle from '@/shared/theme/components/ThemeToggle'
import { Link, Outlet } from 'react-router'

export default function LandingLayout() {
  return (
    <div className="auth-page relative min-h-screen overflow-hidden bg-auth-bg font-auth text-auth-title transition-colors duration-500">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-[-10%] top-[-10%] h-[420px] w-[420px] rounded-full bg-auth-btn/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[420px] w-[420px] rounded-full bg-auth-link/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'radial-gradient(var(--auth-label) 0.5px, transparent 0.5px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <header className="sticky top-0 z-50 border-b border-auth-input-border bg-auth-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link
            to="/"
            className="text-2xl font-bold tracking-tight text-auth-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn rounded-lg"
          >
            Studeo
          </Link>

          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-2 sm:gap-3"
          >
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-auth-label transition hover:bg-auth-input-bg hover:text-auth-title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/register"
              className="auth-btn-primary hidden rounded-xl px-4 py-2 text-sm sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              Registrarse
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl overflow-visible px-4 py-8 sm:px-8 sm:py-12">
        <Outlet />
      </main>
    </div>
  )
}
