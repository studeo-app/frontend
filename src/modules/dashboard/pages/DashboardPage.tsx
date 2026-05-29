import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { ArrowRight, Hash } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

const routeButtons = [
  { path: "/", label: "Landing", description: "Ruta publica principal" },
  { path: "/login", label: "Login", description: "Inicio de sesion" },
  { path: "/register", label: "Registro", description: "Crear una cuenta" },
  {
    path: "/complete-profile",
    label: "Completar perfil",
    description: "Formulario de datos de usuario",
  },
  { path: "/profile", label: "Perfil", description: "Ruta de perfil" },
  {
    path: "/room/1",
    label: "Sala ejemplo",
    description: "Detalle de sala por id",
  },
];

export default function DashboardPage() {
  useDocumentTitle("Dashboard");

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : firebaseUser?.displayName ?? "Usuario";

  const username = profile?.username;
  const avatarUrl =
    profile?.avatarUrl ?? firebaseUser?.photoURL ?? undefined;

  return (
    <section className="space-y-8">
      <header className="rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <UserAvatar
            src={avatarUrl}
            alt={displayName}
            size="xl"
            className="border-auth-btn/60 shadow-lg shadow-auth-btn/10"
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-wider text-auth-label">
              Tu perfil
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-auth-title sm:text-3xl">
              {displayName}
            </h1>
            {username ? (
              <p className="mt-1 text-lg font-medium text-auth-btn">
                @{username}
              </p>
            ) : (
              <p className="mt-1 text-sm text-auth-label">
                {profile?.email ?? firebaseUser?.email}
              </p>
            )}
          </div>
        </div>
      </header>

      <section
        className="rounded-2xl border border-auth-input-border bg-gradient-to-r from-auth-btn/90 to-auth-btn p-6 text-auth-btn-text shadow-sm"
        aria-labelledby="join-room-title"
      >
        <h2
          id="join-room-title"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Unirse a una Sala
        </h2>
        <p className="mt-2 text-sm opacity-90">
          Esta zona central te permite probar las rutas de la app con botones
          accesibles y navegacion por teclado.
        </p>
      </section>

      <section aria-labelledby="routes-title" className="space-y-4">
        <div className="flex items-end justify-between">
          <h2
            id="routes-title"
            className="text-2xl font-semibold tracking-tight text-auth-title sm:text-3xl"
          >
            Mis rutas
          </h2>
          <p className="text-sm text-auth-label">Tab + Enter para navegar</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {routeButtons.map((route) => (
            <button
              key={route.path}
              type="button"
              aria-label={`Navegar a ${route.label}`}
              onClick={() => navigate(route.path)}
              className="group rounded-2xl border border-auth-input-border bg-auth-surface p-5 text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-auth-btn/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              <div className="mb-4 flex h-24 items-center justify-center rounded-xl bg-auth-input-bg/80">
                <Hash className="h-8 w-8 text-auth-label" aria-hidden="true" />
              </div>

              <p className="font-semibold text-auth-title">{route.label}</p>
              <p className="mt-1 text-sm text-auth-label">{route.description}</p>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-auth-link">
                  {route.path}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-auth-btn px-3 py-1.5 text-xs font-semibold text-auth-btn-text">
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
        className="rounded-xl border border-auth-btn/30 bg-auth-btn/10 p-4 text-sm text-auth-title"
      >
        Ruta actual: <span className="font-semibold text-auth-link">{pathname}</span>
      </div>
    </section>
  );
}
