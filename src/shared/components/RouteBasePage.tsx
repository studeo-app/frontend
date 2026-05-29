import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router";

interface RouteBasePageProps {
  title: string;
  description: string;
  routeLabel: string;
}

export default function RouteBasePage({
  title,
  description,
  routeLabel,
}: RouteBasePageProps) {
  return (
    <section className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      <header className="rounded-2xl border border-auth-input-border bg-gradient-to-r from-auth-btn/90 to-auth-btn p-6 text-auth-btn-text shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm opacity-90">{description}</p>
      </header>

      <article className="rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-sm">
        <p className="text-sm text-auth-label">Ruta activa</p>
        <p className="mt-1 text-lg font-semibold text-auth-title">{routeLabel}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            aria-label="Volver al dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-auth-btn px-4 py-2 text-sm font-semibold text-auth-btn-text transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al dashboard
          </Link>

          <Link
            to="/dashboard/profile"
            aria-label="Ir al perfil desde esta pagina"
            className="inline-flex items-center gap-2 rounded-lg border border-auth-input-border bg-auth-bg px-4 py-2 text-sm font-semibold text-auth-title transition hover:bg-auth-input-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
          >
            Ir al perfil
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </section>
  );
}
