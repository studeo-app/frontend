import { useState, useEffect } from "react";
import ThemeToggle from "@/shared/theme/components/ThemeToggle";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Home, LogOut, Palette, User, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";

const appLinks = [
  {
    to: "/dashboard",
    label: "Mis salas",
    icon: Home,
  },
  {
    to: "/profile",
    label: "Perfil",
    icon: User,
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      // Tablet and Mobile defaults to collapsed (width < 1024px)
      if (window.innerWidth < 1024) {
        setIsExpanded(false);
      } else {
        setIsExpanded(true);
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const sidebarWidthClass = isExpanded ? "w-[280px]" : "w-[80px]";

  return (
    <div className="min-h-screen bg-auth-bg font-sans text-auth-title transition-colors duration-500">
      <div className="grid min-h-screen grid-cols-[auto_1fr] relative">
        
        {/* Sidebar */}
        <aside
          className={`
            sticky top-0 h-screen z-40
            border-r border-auth-input-border bg-auth-surface text-auth-title
            transition-all duration-300 ease-in-out overflow-y-auto shrink-0
            ${sidebarWidthClass}
          `}
        >
          <div className="flex h-full flex-col p-5">
            {/* Header */}
            <header className="mb-5 flex items-center justify-between min-h-[40px]">
              {isExpanded ? (
                <>
                  <p className="font-auth text-3xl font-bold tracking-tight text-auth-btn">
                    Studeo
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    aria-label="Colapsar menú"
                    className="hidden md:flex cursor-pointer rounded-lg p-1 text-auth-label hover:bg-auth-input-bg hover:text-auth-title transition-colors duration-200"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  aria-label="Expandir menú"
                  className="hidden md:flex mx-auto cursor-pointer rounded-lg p-1 text-auth-label hover:bg-auth-input-bg hover:text-auth-title transition-colors duration-200"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </header>

            {/* Profile Info */}
            <section
              aria-label="Información del usuario"
              className={`
                mb-5 rounded-xl border border-auth-input-border bg-auth-input-bg/60 p-3 shadow-sm
                transition-all duration-300
                ${isExpanded ? "flex items-center gap-3" : "flex flex-col items-center justify-center"}
              `}
            >
              <UserAvatar src={avatarUrl} alt={displayName} size="md" />
              {isExpanded && (
                <div className="min-w-0 flex-1 animate-fade-in">
                  <p className="truncate text-sm font-semibold text-auth-title">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-auth-label">
                    {username ? `@${username}` : profile?.email ?? firebaseUser?.email}
                  </p>
                </div>
              )}
            </section>

            {/* Navigation Links */}
            <nav aria-label="Navegación principal de la app" className="flex-1">
              <ul className="space-y-2">
                {appLinks.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      aria-label={`Ir a ${label}`}
                      title={!isExpanded ? label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition cursor-pointer ${
                          isExpanded ? "px-3 justify-start" : "px-0 justify-center"
                        } ${
                          isActive
                            ? "bg-auth-btn text-auth-btn-text shadow-sm"
                            : "text-auth-label hover:bg-auth-input-bg hover:text-auth-title"
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn`
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {isExpanded && <span className="truncate animate-fade-in">{label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Footer / Utilities */}
            <div className="mt-auto space-y-3 border-t border-auth-input-border pt-4">
              <div
                title={!isExpanded ? "Cambiar tema" : undefined}
                className={`
                  flex items-center justify-between rounded-lg bg-auth-input-bg/50 py-2
                  ${isExpanded ? "px-3" : "px-0 justify-center"}
                `}
              >
                {isExpanded ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-auth-label" aria-hidden="true" />
                      <p className="text-sm text-auth-label">Tema</p>
                    </div>
                    <ThemeToggle />
                  </>
                ) : (
                  <ThemeToggle />
                )}
              </div>

              <button
                type="button"
                aria-label="Cerrar sesión"
                title={!isExpanded ? "Cerrar sesión" : undefined}
                onClick={handleLogout}
                className={`
                  flex w-full items-center gap-3 rounded-lg py-2 text-sm text-auth-error transition hover:bg-auth-error/10 cursor-pointer
                  ${isExpanded ? "px-3 justify-start" : "px-0 justify-center"}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
                `}
              >
                <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                {isExpanded && <span className="animate-fade-in">Cerrar sesión</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-h-screen bg-auth-bg p-4 sm:p-8 overflow-hidden">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
