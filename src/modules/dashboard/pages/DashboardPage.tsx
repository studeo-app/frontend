import { useState } from "react";
import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRooms } from "@/modules/rooms/hooks/useRooms";
import { CreateRoomModal } from "@/modules/rooms/components/CreateRoomModal";
import { DEFAULT_ROOM_COVERS } from "@/modules/rooms/constants/defaultRoomCovers";
import { ArrowRight, Plus, MoreVertical, Compass, Users } from "lucide-react";
import { useNavigate } from "react-router";

export default function DashboardPage() {
  useDocumentTitle("Dashboard - Mis Salas");
  const navigate = useNavigate();

  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);
  const { rooms, loading, error, refreshRooms } = useRooms();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");

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
    } catch (e) {
      return "Recientemente";
    }
  };

  // Helper to fallback to first cover if room has no imageUrl or preset
  const getRoomCover = (imageUrl?: string) => {
    if (imageUrl) return imageUrl;
    return DEFAULT_ROOM_COVERS[0].src;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Profile Welcome Header */}
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
              Bienvenido de nuevo
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

      {/* Unirse a una Sala Container */}
      <section
        className="rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-sm"
        aria-labelledby="join-room-title"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
            className="flex items-center gap-2 max-w-md w-full"
          >
            <input
              type="text"
              placeholder="Código (Ej: STU-452)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="flex-1 h-11 px-4 text-sm rounded-xl border border-auth-input-border bg-auth-input-bg text-auth-title focus:outline-none focus:ring-2 focus:ring-auth-btn focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={!inviteCode.trim()}
              className="h-11 px-5 bg-auth-btn text-auth-btn-text font-semibold rounded-xl text-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
            >
              <span>Unirse</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Mis Salas Section */}
      <section aria-labelledby="my-rooms-title" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2
            id="my-rooms-title"
            className="text-2xl font-bold tracking-tight text-auth-title"
          >
            Mis Salas
          </h2>

        </div>

        {loading ? (
          /* Loading Skeletal State */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="aspect-[4/5] rounded-2xl border-2 border-dashed border-auth-input-border bg-auth-input-bg/10 flex items-center justify-center animate-pulse" />
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
          <div className="rounded-2xl border border-auth-error/20 bg-auth-error/5 p-6 text-center space-y-4">
            <p className="text-sm text-auth-error font-medium">{error}</p>
            <button
              onClick={refreshRooms}
              className="px-4 py-2 bg-auth-error text-white text-xs font-semibold rounded-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : rooms.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-auth-input-border bg-auth-surface py-12 px-6 text-center max-w-xl mx-auto space-y-5 shadow-sm">
            <div className="h-16 w-16 bg-auth-btn/10 text-auth-btn rounded-full flex items-center justify-center mx-auto">
              <Compass className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-auth-title">No hay salas de estudio</h3>
              <p className="text-sm text-auth-label">
                No tienes ninguna sala de estudio todavía. ¡Crea una nueva sala o únete a una existente con un código!
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-auth-btn text-auth-btn-text text-sm font-semibold rounded-xl hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Crear mi primera sala
            </button>
          </div>
        ) : (
          /* Rooms Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Dotted Create Card */}
            <div
              onClick={() => setIsCreateModalOpen(true)}
              className="aspect-[4/5] rounded-2xl border-2 border-dashed border-auth-input-border hover:border-auth-btn/50 hover:bg-auth-input-bg/10 flex flex-col items-center justify-center gap-3 cursor-pointer transition duration-300 group"
            >
              <div className="h-10 w-10 bg-auth-input-bg text-auth-label group-hover:text-auth-btn group-hover:scale-110 rounded-full flex items-center justify-center transition duration-300 shadow-inner">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold text-auth-label group-hover:text-auth-title transition">
                Nueva Sala
              </span>
            </div>

            {/* Room cards */}
            {rooms.map((room) => {
              const isOwner = room.ownerUid === firebaseUser?.uid;
              return (
                <article
                  key={room.id}
                  className="group rounded-2xl border border-auth-input-border bg-auth-surface overflow-hidden shadow-sm hover:shadow-md transition duration-300 flex flex-col h-full relative"
                >
                  {/* Options Menu Button (Visual Only) */}
                  <button className="absolute top-3 right-3 z-10 h-7 w-7 bg-black/40 text-white hover:bg-black/60 rounded-full flex items-center justify-center transition border-none cursor-pointer">
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {/* Card Cover Image */}
                  <div className="w-full aspect-video overflow-hidden bg-auth-input-bg relative shrink-0">
                    <img
                      src={getRoomCover(room.imageUrl)}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>

                  {/* Details */}
                  <div className="p-5 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base text-auth-title tracking-tight line-clamp-1">
                        {room.name}
                      </h3>
                      <p className="text-xs text-auth-label">
                        Creado el {formatDate(room.createdAt)}
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-auth-label font-medium bg-auth-input-bg px-2.5 py-1 rounded-full">
                          <Users className="h-3 w-3" />
                          24 Miembros
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${isOwner
                            ? "bg-auth-btn/10 text-auth-btn"
                            : "bg-auth-label/10 text-auth-label"
                            }`}
                        >
                          {isOwner ? "Anfitrión" : "Miembro"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/room/${room.id}`)}
                      className="w-full h-10 bg-auth-btn text-auth-btn-text text-sm font-semibold rounded-xl transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
                    >
                      Entrar
                    </button>
                  </div>
                </article>
              );
            })}
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
