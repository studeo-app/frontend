import ThemeToggle from '@/shared/theme/components/ThemeToggle'
import { Home, LogIn } from 'lucide-react'
import { Link, Outlet } from 'react-router'

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <div className="mx-auto grid min-h-screen max-w-[1500px] md:grid-cols-[280px_1fr]">
        <aside className="border-r border-border/80 bg-sidebar text-sidebar-foreground">
          <div className="flex h-full flex-col p-5">
            <header className="mb-5">
              <p className="text-3xl font-semibold tracking-tight text-primary">
                Studeo
              </p>
              <p className="text-sm text-muted-foreground">Rutas publicas</p>
            </header>

            <nav aria-label="Acciones rapidas publicas">
              <ul className="space-y-2">
                <li>
                  <Link
                    to="/dashboard"
                    aria-label="Ir al dashboard"
                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span>Ir al dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    aria-label="Ir al login"
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    <span>Login</span>
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Cambiar tema</p>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <main className="bg-background p-4 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
