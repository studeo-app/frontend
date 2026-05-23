import ThemeToggle from '@/shared/theme/components/ThemeToggle'
import { Home, LogOut, Palette, User, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

const appLinks = [
  {
    to: '/dashboard',
    label: 'Mis salas',
    icon: Home,
  },
  {
    to: '/dashboard/profile',
    label: 'Perfil',
    icon: User,
  },
  {
    to: '/room/1',
    label: 'Sala ejemplo',
    icon: Users,
  },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <div className="mx-auto grid min-h-screen max-w-[1500px] md:grid-cols-[280px_1fr]">
        <aside className="border-r border-border/80 bg-sidebar text-sidebar-foreground">
          <div className="flex h-full flex-col p-5">
            <header className="mb-5">
              <p className="text-3xl font-semibold tracking-tight text-primary">
                Studeo
              </p>
            </header>

            <section
              aria-label="Informacion del usuario"
              className="mb-5 rounded-xl border border-border bg-card/80 p-3 shadow-sm"
            >
              <p className="text-sm font-semibold">Usuario Pro</p>
              <p className="text-xs text-muted-foreground">@estudiante_dev</p>
            </section>

            <nav aria-label="Navegacion principal de la app">
              <ul className="space-y-2">
                {appLinks.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      aria-label={`Ir a ${label}`}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between rounded-lg bg-card/70 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Palette
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">Cambiar tema</p>
                </div>
                <ThemeToggle />
              </div>

              <button
                type="button"
                aria-label="Cerrar sesion"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Cerrar sesion</span>
              </button>
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
