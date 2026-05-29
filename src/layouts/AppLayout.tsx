import ThemeToggle from "@/shared/theme/components/ThemeToggle";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Home, LogOut, Palette, User, Users } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";

const appLinks = [
  {
    to: "/dashboard",
    label: "Mis salas",
    icon: Home,
  },
  {
    to: "/dashboard/profile",
    label: "Perfil",
    icon: User,
  },
  {
    to: "/room/1",
    label: "Sala ejemplo",
    icon: Users,
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : firebaseUser?.displayName ?? "Usuario";

  const username = profile?.username;
  const avatarUrl =
    profile?.avatarUrl ?? firebaseUser?.photoURL ?? undefined;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-auth-bg font-sans text-auth-title transition-colors duration-500">
      <div className="mx-auto grid min-h-screen max-w-375 md:grid-cols-[280px_1fr]">
        <aside className="border-r border-auth-input-border bg-auth-surface text-auth-title">
          <div className="flex h-full flex-col p-5">
            <header className="mb-5">
              <p className="font-auth text-3xl font-bold tracking-tight text-auth-btn">
                Studeo
              </p>
            </header>

            <section
              aria-label="Informacion del usuario"
              className="mb-5 rounded-xl border border-auth-input-border bg-auth-input-bg/60 p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <UserAvatar src={avatarUrl} alt={displayName} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-auth-title">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-auth-label">
                    {username ? `@${username}` : profile?.email ?? firebaseUser?.email}
                  </p>
                </div>
              </div>
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
                            ? "bg-auth-btn text-auth-btn-text shadow-sm"
                            : "text-auth-label hover:bg-auth-input-bg hover:text-auth-title"
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn`
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto space-y-3 border-t border-auth-input-border pt-4">
              <div className="flex items-center justify-between rounded-lg bg-auth-input-bg/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Palette
                    className="h-4 w-4 text-auth-label"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-auth-label">Cambiar tema</p>
                </div>
                <ThemeToggle />
              </div>

              <button
                type="button"
                aria-label="Cerrar sesion"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-auth-error transition hover:bg-auth-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>Cerrar sesion</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="bg-auth-bg p-4 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
