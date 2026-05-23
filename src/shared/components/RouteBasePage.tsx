import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

interface RouteBasePageProps {
  title: string
  description: string
  routeLabel: string
}

export default function RouteBasePage({
  title,
  description,
  routeLabel,
}: RouteBasePageProps) {
  return (
    <section className="space-y-8">
      <header className="rounded-2xl border border-border bg-gradient-to-r from-primary/90 to-primary p-6 text-primary-foreground shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-primary-foreground/90">{description}</p>
      </header>

      <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Ruta activa</p>
        <p className="mt-1 text-lg font-semibold">{routeLabel}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            aria-label="Volver al dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al dashboard
          </Link>

          <Link
            to="/dashboard/profile"
            aria-label="Ir al perfil desde esta pagina"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ir al perfil
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </section>
  )
}
