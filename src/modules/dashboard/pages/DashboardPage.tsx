import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { ArrowRight, Hash } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

const routeButtons = [
  { path: '/', label: 'Landing', description: 'Ruta publica principal' },
  { path: '/login', label: 'Login', description: 'Inicio de sesion' },
  { path: '/register', label: 'Registro', description: 'Crear una cuenta' },
  {
    path: '/complete-profile',
    label: 'Completar perfil',
    description: 'Formulario de datos de usuario',
  },
  { path: '/dashboard/profile', label: 'Perfil', description: 'Ruta de perfil' },
  {
    path: '/room/1',
    label: 'Sala ejemplo',
    description: 'Detalle de sala por id',
  },
]

export default function DashboardPage() {
  useDocumentTitle('Dashboard')

  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <section className="space-y-8">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">Unirse a una Sala</h1>
        <p className="mt-2 text-sm text-primary-foreground/90">
          Esta zona central te permite probar las rutas de la app con botones
          accesibles y navegacion por teclado.
        </p>
      </header>

      <section aria-labelledby="routes-title" className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 id="routes-title" className="text-3xl font-semibold tracking-tight">
            Mis rutas
          </h2>
          <p className="text-sm text-muted-foreground">Tab + Enter para navegar</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {routeButtons.map((route) => (
            <button
              key={route.path}
              type="button"
              aria-label={`Navegar a ${route.label}`}
              onClick={() => navigate(route.path)}
              className="group rounded-2xl border border-border bg-card p-5 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl bg-muted/50">
                <Hash className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
              </div>

              <p className="font-semibold">{route.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {route.description}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-primary">{route.path}</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                  Entrar
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div
        aria-live="polite"
        className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm"
      >
        Ruta actual: <span className="font-semibold">{pathname}</span>
      </div>
    </section>
  )
}
