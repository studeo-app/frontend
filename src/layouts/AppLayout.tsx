import { useState, useEffect } from "react";
import ThemeToggle from "@/shared/theme/components/ThemeToggle";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Home, LogOut, Palette, User, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useRooms } from "@/modules/rooms/hooks/useRooms";

const appLinks = [
  {
    to: "/dashboard",
    label: "Mis salas",
    icon: Home,
  },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { rooms, loading } = useRooms();

  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  const [roomsDropdownOpen, setRoomsDropdownOpen] = useState(true);

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
  const isActiveRoomPage = /^\/room\/[^/]+$/.test(location.pathname);

  return (
    <div className="h-screen w-screen bg-auth-bg font-sans text-auth-title transition-colors duration-500 overflow-hidden">
      <a
        href="#main-content"
        className="absolute left-4 -top-16 z-[100] rounded-lg bg-auth-btn px-4 py-2 text-sm font-semibold text-auth-btn-text outline-none ring-2 ring-auth-btn ring-offset-2 transition-[top] focus:top-4"
      >
        Saltar al contenido principal
      </a>
      <div className="grid h-screen grid-cols-[auto_1fr] relative overflow-hidden">

        {/* Sidebar */}
        <aside
          className={`
            h-screen relative z-50
            border-r border-auth-input-border bg-auth-surface text-auth-title
            transition-all duration-300 ease-in-out shrink-0
            shadow-[1px_0_10px_rgba(0,0,0,0.03)]
            ${isExpanded ? "overflow-y-auto" : "overflow-visible"}
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

            {/* Profile Info - Clickable */}
            <button
              onClick={() => navigate("/profile")}
              aria-label="Ir al perfil"
              className={`
                mb-5 transition-all duration-300 cursor-pointer
                ${isExpanded 
                  ? "w-full rounded-xl border border-auth-input-border bg-auth-input-bg/60 shadow-sm flex items-center gap-3 p-3 hover:bg-auth-input-bg hover:border-auth-btn/30 text-left" 
                  : "mx-auto flex flex-col items-center justify-center border-0 bg-transparent p-0 hover:scale-105"
                }
              `}
            >
              <UserAvatar src={avatarUrl} alt={displayName} size={isExpanded ? "md" : "sm"} />
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
            </button>

            {/* Navigation Links */}
            <nav aria-label="Navegación principal de la app" className="flex-1">
              <ul className="space-y-2">
                {appLinks.map(({ to, label, icon: Icon }) => {
                  if (label === "Mis salas") {
                    return (
                      <li key={to} className="flex flex-col">
                        <div className="flex items-center justify-between group relative">
                          <NavLink
                            to={to}
                            aria-label={`Ir a ${label}`}
                            title={!isExpanded ? label : undefined}
                            className={({ isActive }) =>
                              `flex-1 flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${isExpanded ? "pl-3 pr-8 justify-start" : "px-0 justify-center"
                              } ${isActive
                                ? "bg-auth-btn text-auth-btn-text shadow-sm"
                                : "text-auth-label hover:bg-auth-input-bg hover:text-auth-title"
                              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn`
                            }
                          >
                            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            {isExpanded && <span className="truncate animate-fade-in">{label}</span>}
                          </NavLink>
                          {isExpanded && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setRoomsDropdownOpen(!roomsDropdownOpen);
                              }}
                              aria-label="Alternar lista de salas"
                              aria-expanded={roomsDropdownOpen}
                              aria-controls="sidebar-rooms-list"
                              className="absolute right-2 p-1 rounded-md text-auth-label hover:bg-auth-input-bg hover:text-auth-title transition-colors cursor-pointer"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${roomsDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>
                        {/* Rooms dropdown list */}
                        {isExpanded && roomsDropdownOpen && (
                          <ul id="sidebar-rooms-list" className="pl-4 mt-1.5 space-y-1 border-l border-auth-input-border/60 ml-5 animate-fade-in">
                            {loading ? (
                              <li className="text-xs text-auth-label py-1 px-3" role="status">Cargando salas...</li>
                            ) : rooms.length === 0 ? (
                              <li className="text-xs text-auth-label py-1 px-3">Sin salas</li>
                            ) : (
                              rooms.map((room) => (
                                <li key={room.id}>
                                  <NavLink
                                    to={`/room/${room.id}/lobby`}
                                    title={room.name}
                                    className={({ isActive }) =>
                                      `flex items-center gap-2 rounded-md py-1.5 px-2 text-xs font-medium transition-colors duration-200 cursor-pointer ${isActive
                                        ? "bg-auth-btn/10 text-auth-btn font-semibold"
                                        : "text-auth-label hover:bg-auth-input-bg hover:text-auth-title"
                                      }`
                                    }
                                  >
                                    {room.imageUrl ? (
                                      <img
                                        src={room.imageUrl}
                                        alt=""
                                        className="h-7 w-7 rounded-full object-cover shrink-0 border border-auth-input-border/50"
                                      />
                                    ) : (
                                      <span className="h-4 w-4 rounded-full bg-auth-btn/20 text-auth-btn flex items-center justify-center text-[9px] font-bold shrink-0">
                                        {room.name.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                    <span className="truncate">{room.name}</span>
                                  </NavLink>
                                </li>
                              ))
                            )}
                          </ul>
                        )}

                        {/* Collapsed rooms list (Discord-style) */}
                        {!isExpanded && (
                          <ul className="mt-2.5 space-y-2 flex flex-col items-center animate-fade-in relative z-50">
                            {rooms.map((room) => (
                              <li key={room.id} className="relative group/tooltip">
                                <NavLink
                                  to={`/room/${room.id}/lobby`}
                                  aria-label={`Ir a la sala ${room.name}`}
                                  className={({ isActive }) =>
                                    `flex h-9 w-9 items-center justify-center rounded-3xl transition-all duration-300 cursor-pointer overflow-hidden border border-auth-input-border/40 ${
                                      isActive
                                        ? "rounded-xl bg-auth-btn text-auth-btn-text shadow-md shadow-auth-btn/25"
                                        : "bg-auth-input-bg hover:rounded-xl hover:bg-auth-btn hover:text-auth-btn-text"
                                    }`
                                  }
                                >
                                  {room.imageUrl ? (
                                    <img
                                      src={room.imageUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-extrabold uppercase text-auth-btn group-hover:text-auth-btn-text transition">
                                      {room.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </NavLink>
                                
                                {/* Discord-style tooltip */}
                                <div
                                  role="tooltip"
                                  className="absolute left-12 top-1/2 -translate-y-1/2 hidden group-hover/tooltip:block group-focus-within/tooltip:block bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-[100] pointer-events-none shadow-lg border border-slate-700/50"
                                >
                                  {room.name}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  }

                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        aria-label={`Ir a ${label}`}
                        title={!isExpanded ? label : undefined}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer ${
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
                  );
                })}
              </ul>
            </nav>

            {/* Footer / Utilities */}
            <div className="mt-auto space-y-3 border-t border-auth-input-border pt-4">
              {/* Profile button repositioned here */}
              <NavLink
                to="/profile"
                aria-label="Ir a Perfil"
                title={!isExpanded ? "Perfil" : undefined}
                className={({ isActive }) =>
                  `flex items-center cursor-pointer transition-colors duration-200 ${
                    isExpanded 
                      ? "px-3 py-2.5 text-sm font-medium justify-start gap-3 rounded-lg w-full" 
                      : "h-10 w-10 mx-auto justify-center rounded-lg"
                  } ${
                    isActive
                      ? "bg-auth-btn text-auth-btn-text shadow-sm"
                      : "text-auth-label hover:bg-auth-input-bg hover:text-auth-title"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn`
                }
              >
                <User className="h-5 w-5 shrink-0" aria-hidden="true" />
                {isExpanded && <span className="truncate animate-fade-in">Perfil</span>}
              </NavLink>

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
                  flex items-center transition-colors duration-200 cursor-pointer
                  font-medium text-sm
                  bg-red-600 text-white hover:bg-red-500 active:bg-red-700
                  ${isExpanded
                    ? "px-4 py-2.5 justify-start w-full border border-auth-error/30 bg-auth-error/5 hover:bg-auth-error/15 text-auth-error active:bg-auth-error/25 shadow-sm rounded-lg gap-3"
                    : "h-10 w-10 mx-auto justify-center text-auth-error hover:bg-auth-error/10 rounded-lg"
                  }
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
                `}
              >
                <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                {isExpanded && <span className="animate-fade-in font-semibold">Cerrar sesión</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          id="main-content"
          className={`h-screen bg-auth-bg overflow-y-auto ${isActiveRoomPage ? "p-0" : "p-4 sm:p-8"}`}
          tabIndex={-1}
        >
          <div className={isActiveRoomPage ? "h-full" : "mx-auto max-w-6xl"}>
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}
