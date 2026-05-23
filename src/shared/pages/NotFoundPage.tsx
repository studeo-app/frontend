import useDocumentTitle from '@/shared/hooks/useDocumentTitle'
import { Link } from 'react-router'

export default function NotFoundPage() {
  useDocumentTitle('404')

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-primary">Error 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ruta no encontrada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La pagina que intentaste abrir no existe o fue movida.
        </p>

        <Link
          to="/dashboard"
          aria-label="Volver al dashboard"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ir al dashboard
        </Link>
      </section>
    </main>
  )
}
