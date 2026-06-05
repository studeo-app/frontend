import { useState } from "react";
import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRooms } from "@/modules/rooms/hooks/useRooms";
import { CreateRoomModal } from "@/modules/rooms/components/CreateRoomModal";
import { DEFAULT_ROOM_COVERS } from "@/modules/rooms/constants/defaultRoomCovers";
import { ArrowRight, Plus, Compass, Users, Filter, Search, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";

export default function DashboardPage() {
  useDocumentTitle("Dashboard - Mis Salas");
  const navigate = useNavigate();

  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);
  const { rooms, loading, error, refreshRooms } = useRooms();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'owner' | 'member'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : firebaseUser?.displayName ?? "Usuario";

  const username = profile?.username;
  const avatarUrl =
    profile?.avatarUrl ?? firebaseUser?.photoURL ?? undefined;

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    // Redirigir a la sala usando el código ingresado
    navigate(`/room/${inviteCode.trim()}`);
  };

  const handleCreateSuccess = (roomId: string) => {
    setIsCreateModalOpen(false);
    refreshRooms();
    // Redirigir automáticamente a la sala creada
    navigate(`/room/${roomId}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
      });
    } catch {
      return "Recientemente";
    }
  };

  // Helper to fallback to first cover if room has no imageUrl or preset
  const getRoomCover = (imageUrl?: string) => {
    if (imageUrl) return imageUrl;
    return DEFAULT_ROOM_COVERS[0].src;
  };

  // Handle Search and resets page to 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (val: 'all' | 'owner' | 'member') => {
    setFilterType(val);
    setCurrentPage(1);
  };

  const handleSortByChange = (val: 'newest' | 'oldest' | 'alphabetical') => {
    setSortBy(val);
    setCurrentPage(1);
  };

  // Filter and sort rooms list
  const filteredRooms = rooms
    .filter((room) => {
      const nameMatch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isOwner = room.ownerUid === firebaseUser?.uid;
      const typeMatch =
        filterType === 'owner' ? isOwner :
        filterType === 'member' ? !isOwner :
        true;
      return nameMatch && typeMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Pagination calculation
  const showCreateCard = currentPage === 1 && searchQuery.trim() === "" && filterType === "all";
  const totalItems = filteredRooms.length + (showCreateCard ? 1 : 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Slice rooms list for the paginated view
  const paginatedRooms = (() => {
    if (currentPage === 1) {
      // Slot 1 is the "Nueva Sala" card, so render first 7 rooms
      return filteredRooms.slice(0, itemsPerPage - 1);
    }
    const offset = showCreateCard ? -1 : 0;
    const start = (currentPage - 1) * itemsPerPage + offset;
    const end = start + itemsPerPage;
    return filteredRooms.slice(start, end);
  })();

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Profile Welcome Header Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-md">
        {/* Glowing backdrop banner decoration */}
        <div className="absolute top-0 right-0 w-80 h-32 bg-auth-btn/5 blur-3xl rounded-full -mr-16 -mt-10 pointer-events-none" />
        
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <UserAvatar
            src={avatarUrl}
            alt={displayName}
            size="xl"
            className="border-auth-btn/50 shadow-lg shadow-auth-btn/10"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-auth-label/85">
              Panel de Control
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-auth-title sm:text-3xl">
              ¡Hola de nuevo, {displayName.split(" ")[0]}!
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-sm font-semibold text-auth-btn">
                {username ? `@${username}` : profile?.email ?? firebaseUser?.email}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-auth-input-border" />
              <span className="text-xs text-auth-label font-medium bg-auth-input-bg px-2.5 py-0.5 rounded-full border border-auth-input-border">
                {rooms.length} {rooms.length === 1 ? "sala activa" : "salas activas"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Unirse a una Sala Container */}
      <section
        className="rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-sm relative overflow-hidden"
        aria-labelledby="join-room-title"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2
              id="join-room-title"
              className="text-xl font-bold tracking-tight text-auth-title"
            >
              Unirse a una Sala
            </h2>
            <p className="text-sm text-auth-label">
              Introduce el código de invitación para entrar en una sesión activa.
            </p>
          </div>
          <form
            onSubmit={handleJoinRoom}
            className="flex items-center gap-2.5 max-w-md w-full"
          >
            <input
              type="text"
              placeholder="Código de la sala (Ej: STU-452)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              aria-label="Código de invitación de la sala"
              className="flex-1 h-11 px-4 text-sm rounded-xl border border-auth-input-border bg-auth-input-bg/40 text-auth-title placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-auth-btn focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={!inviteCode.trim()}
              className="h-11 px-5 bg-auth-btn text-auth-btn-text font-semibold rounded-xl text-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Unirse</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </section>

      {/* Mis Salas Section */}
      <section aria-labelledby="my-rooms-title" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2
            id="my-rooms-title"
            className="text-2xl font-bold tracking-tight text-auth-title"
          >
            Mis Salas
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input Filter */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Buscar salas..."
                value={searchQuery}
                onChange={handleSearchChange}
                aria-label="Buscar salas de estudio"
                className="h-10 pl-9 pr-4 text-sm rounded-xl border border-auth-input-border bg-auth-surface text-auth-title placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-auth-btn focus:border-transparent transition w-full sm:w-60 shadow-sm"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-label" aria-hidden="true">
                <Search className="h-4 w-4 opacity-70" />
              </span>
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-label="Filtrar y ordenar salas"
              className={`h-10 px-4 flex items-center justify-center gap-2 border border-auth-input-border bg-auth-surface text-auth-title rounded-xl text-sm font-semibold hover:bg-auth-input-bg transition cursor-pointer shadow-sm ${
                showFilters ? "border-auth-btn bg-auth-btn/5 text-auth-btn" : ""
              }`}
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* Filters Toggle Panel */}
        {showFilters && (
          <div className="p-4 bg-auth-surface border border-auth-input-border rounded-2xl flex flex-wrap gap-6 text-sm animate-scale-up shadow-sm">
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-auth-label uppercase tracking-wider">Mostrar</span>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'owner', label: 'Anfitrión' },
                  { value: 'member', label: 'Miembro' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleFilterTypeChange(opt.value as 'all' | 'owner' | 'member')}
                    aria-pressed={filterType === opt.value}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn ${
                      filterType === opt.value
                        ? 'bg-auth-btn text-auth-btn-text border-transparent shadow-sm'
                        : 'bg-auth-input-bg/40 text-auth-label border-auth-input-border hover:bg-auth-input-bg'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-auth-label uppercase tracking-wider">Ordenar por</span>
              <div className="flex gap-2">
                {[
                  { value: 'newest', label: 'Más recientes' },
                  { value: 'oldest', label: 'Más antiguas' },
                  { value: 'alphabetical', label: 'Nombre (A-Z)' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSortByChange(opt.value as 'newest' | 'oldest' | 'alphabetical')}
                    aria-pressed={sortBy === opt.value}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn ${
                      sortBy === opt.value
                        ? 'bg-auth-btn text-auth-btn-text border-transparent shadow-sm'
                        : 'bg-auth-input-bg/40 text-auth-label border-auth-input-border hover:bg-auth-input-bg'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          /* Loading Skeletal State */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="aspect-[4/5] rounded-2xl border border-dashed border-auth-input-border bg-auth-input-bg/10 flex items-center justify-center animate-pulse" />
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl border border-auth-input-border bg-auth-surface overflow-hidden shadow-sm animate-pulse">
                <div className="w-full aspect-video bg-auth-input-bg/50" />
                <div className="p-5 space-y-4">
                  <div className="h-4 bg-auth-input-bg/50 rounded w-2/3" />
                  <div className="h-3 bg-auth-input-bg/50 rounded w-1/2" />
                  <div className="h-10 bg-auth-input-bg/50 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div role="alert" className="rounded-2xl border border-auth-error/20 bg-auth-error/5 py-12 px-6 text-center max-w-xl mx-auto space-y-5 shadow-sm animate-scale-up">
            <div className="h-16 w-16 bg-auth-error/10 text-auth-error rounded-full flex items-center justify-center mx-auto" aria-hidden="true">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-auth-title">Error de Conexión</h3>
              <p className="text-sm text-auth-label">
                Ocurrió un error con el servidor, por favor intenta más tarde.
              </p>
            </div>
            <button
              onClick={refreshRooms}
              className="px-5 py-2.5 bg-auth-error text-white text-xs font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition cursor-pointer shadow-md shadow-auth-error/15"
            >
              Reintentar
            </button>
          </div>
        ) : totalItems === 0 ? (
          /* Empty State */
          <div role="status" aria-live="polite" className="rounded-2xl border border-auth-input-border bg-auth-surface py-12 px-6 text-center max-w-xl mx-auto space-y-5 shadow-sm">
            <div className="h-16 w-16 bg-auth-btn/10 text-auth-btn rounded-full flex items-center justify-center mx-auto" aria-hidden="true">
              <Compass className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-auth-title">No se encontraron salas</h3>
              <p className="text-sm text-auth-label">
                Prueba buscando con otro término o limpiando los filtros activos.
              </p>
            </div>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
              }}
              className="px-5 py-2 bg-auth-btn text-auth-btn-text text-xs font-semibold rounded-xl hover:brightness-110 transition cursor-pointer"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          /* Rooms Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Dotted Create Card (Only on Page 1) */}
            {showCreateCard && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                aria-label="Crear nueva sala"
                className="aspect-[4/5] w-full rounded-2xl border border-dashed border-auth-input-border hover:border-auth-btn/50 hover:bg-auth-input-bg/10 flex flex-col items-center justify-center gap-3 cursor-pointer transition duration-300 group shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
              >
                <div className="h-10 w-10 bg-auth-input-bg text-auth-label group-hover:text-auth-btn group-hover:scale-110 rounded-full flex items-center justify-center transition duration-300 shadow-inner" aria-hidden="true">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold text-auth-label group-hover:text-auth-title transition" aria-hidden="true">
                  Nueva Sala
                </span>
              </button>
            )}

            {rooms.length === 0 && (
              <div className="col-span-full py-8 text-center text-auth-label">
                <p aria-live="polite" className="text-sm">No tienes salas de estudio creadas todavía. ¡Haz clic en 'Nueva Sala' para comenzar!</p>
              </div>
            )}

            {/* Room cards */}
            {paginatedRooms.map((room) => {
              const isOwner = room.ownerUid === firebaseUser?.uid;
              return (
                <article
                  key={room.id}
                  role="region"
                  aria-label={`Sala de estudio: ${room.name}`}
                  className="group rounded-2xl border border-auth-input-border bg-auth-surface overflow-hidden shadow-sm hover:shadow-md hover:border-auth-btn/20 transition-all duration-300 flex flex-col h-full relative"
                >
                  {/* Card Cover Image */}
                  <div className="w-full aspect-video overflow-hidden bg-auth-input-bg relative shrink-0">
                    <img
                      src={getRoomCover(room.imageUrl)}
                      alt=""
                      aria-hidden="true"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  </div>

                  {/* Details */}
                  <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-base text-auth-title tracking-tight line-clamp-1 group-hover:text-auth-btn transition-colors">
                        {room.name}
                      </h3>
                      <p className="text-xs text-auth-label/80">
                        Creado el {formatDate(room.createdAt)}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-auth-label font-medium bg-auth-input-bg/70 border border-auth-input-border/50 px-2.5 py-1 rounded-full">
                          <Users className="h-3 w-3 text-auth-label" aria-hidden="true" />
                          <span>1 Estudiante</span>
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${
                            isOwner
                              ? "bg-auth-btn/10 text-auth-btn border-auth-btn/25"
                              : "bg-auth-input-bg text-auth-label border-auth-input-border"
                          }`}
                        >
                          {isOwner ? "Creado por ti" : "Invitación"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/room/${room.id}`)}
                      aria-label={`Entrar a la sala ${room.name}`}
                      className="w-full h-10 bg-auth-btn text-auth-btn-text text-sm font-semibold rounded-xl transition hover:brightness-110 active:scale-[0.98] cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
                    >
                      Entrar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-8">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
              className="p-2 border border-auth-input-border rounded-xl bg-auth-surface text-auth-title disabled:opacity-40 disabled:cursor-not-allowed hover:bg-auth-input-bg transition cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-xs text-auth-label font-bold px-3">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
              className="p-2 border border-auth-input-border rounded-xl bg-auth-surface text-auth-title disabled:opacity-40 disabled:cursor-not-allowed hover:bg-auth-input-bg transition cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>

      {/* Create Modal */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
