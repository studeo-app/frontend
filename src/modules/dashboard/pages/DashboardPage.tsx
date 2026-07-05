import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Compass,
  Copy,
  Eye,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import useDocumentTitle from "@/shared/hooks/useDocumentTitle";
import { connectSocket } from "@/config/socket.config";
import { UserAvatar } from "@/shared/components/user/UserAvatar";
import { BaseModal } from "@/shared/components/ui/BaseModal";
import { ErrorModal } from "@/shared/components/ui/ErrorModal";
import { WarningModal } from "@/shared/components/ui/WarningModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRoomsStore } from "@/stores/useRoomsStore";
import { useRooms } from "@/modules/rooms/hooks/useRooms";
import { CreateRoomModal } from "@/modules/rooms/components/CreateRoomModal";
import { RoomActionsMenu } from "@/modules/rooms/components/RoomActionsMenu";
import { ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/socketEvents";
import {
  ROOM_DELETED_DASHBOARD_NOTICE,
  hasRoomDeletedDashboardNotice,
  ROOM_KICKED_DASHBOARD_NOTICE,
  hasRoomKickedDashboardNotice,
} from "@/modules/rooms/constants/roomDeletionNotice";
import { DEFAULT_ROOM_COVERS } from "@/modules/rooms/constants/defaultRoomCovers";
import { joinRoomByCode, removeRoomMembership } from "@/modules/rooms/api/roomsApi";
import { isValidRoomCode, parseRoomCodeFromInput } from "@/modules/rooms/utils/roomCode";
import type { Room } from "@/types/room";

interface EmptySectionProps {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
}

function EmptySection({ icon: Icon, title, message, action }: EmptySectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface px-6 py-10 text-center shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-auth-btn/6 via-transparent to-auth-link/5"
        aria-hidden="true"
      />
      <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-auth-btn/20 bg-auth-btn/10 text-auth-btn">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="relative text-base font-bold text-auth-title">{title}</h3>
      <p className="relative mx-auto mt-1 max-w-md text-sm leading-relaxed text-auth-label">
        {message}
      </p>
      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  useDocumentTitle("Dashboard - Mis Salas");
  const navigate = useNavigate();
  const location = useLocation();

  const profile = useAuthStore((state) => state.profile);
  const firebaseUser = useAuthStore((state) => state.user);
  const getIdToken = useAuthStore((state) => state.getIdToken);
  const { rooms, loading, error, refreshRooms } = useRooms();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinErrorTitle, setJoinErrorTitle] = useState("No pudimos unirte a la sala");
  const [isJoining, setIsJoining] = useState(false);
  const [removingRoomId, setRemovingRoomId] = useState<string | null>(null);
  const [roomToLeave, setRoomToLeave] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [membersRoom, setMembersRoom] = useState<Room | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState("");

  const membersByRoomId = useRoomsStore((state) => state.membersByRoomId);
  const membersLoading = useRoomsStore((state) => state.membersLoading);
  const updateRoomLocally = useRoomsStore((state) => state.updateRoomLocally);
  const membersError = useRoomsStore((state) => state.membersError);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [roomDeletedWarningOpen, setRoomDeletedWarningOpen] = useState(() =>
    hasRoomDeletedDashboardNotice(location.state),
  );
  const [roomKickedWarningOpen, setRoomKickedWarningOpen] = useState(() =>
    hasRoomKickedDashboardNotice(location.state),
  );
  const subscribeRoomsMembers = useRoomsStore((state) => state.subscribeRoomsMembers);
  const removeRoomMembersLocally = useRoomsStore((state) => state.removeRoomMembersLocally);

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : firebaseUser?.displayName ?? "Usuario";

  const username = profile?.username;
  const avatarUrl = profile?.avatarUrl ?? firebaseUser?.photoURL ?? undefined;

  const emitRoomSocketEvent = (
    token: string,
    event: "deleteRoom" | "leaveRoom" | "roomMemberRemoved",
    roomId: string,
  ) => {
    const socket = connectSocket(token);
    const emit = () => {
      if (event === ROOM_SOCKET_EVENTS.DELETE_ROOM) {
        socket.emit(ROOM_SOCKET_EVENTS.DELETE_ROOM, { roomId });
        return;
      }

      if (event === ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED) {
        socket.emit(ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, { roomId });
        return;
      }

      socket.emit(ROOM_SOCKET_EVENTS.LEAVE_ROOM, roomId);
    };

    if (socket.connected) {
      emit();
    } else {
      socket.once("connect", emit);
    }
  };

  useEffect(() => {
    if (hasRoomDeletedDashboardNotice(location.state)) {
      setRoomDeletedWarningOpen(true);
    }
    if (hasRoomKickedDashboardNotice(location.state)) {
      setRoomKickedWarningOpen(true);
    }
  }, [location.state]);

  const handleRoomDeletedWarningClose = () => {
    setRoomDeletedWarningOpen(false);
    navigate("/dashboard", { replace: true, state: null });
  };

  const handleRoomKickedWarningClose = () => {
    setRoomKickedWarningOpen(false);
    navigate("/dashboard", { replace: true, state: null });
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const roomCode = parseRoomCodeFromInput(inviteCode);
    if (!isValidRoomCode(roomCode)) {
      setJoinErrorTitle("Código inválido");
      setJoinError("Ingresa un código alfanumérico de 6 caracteres.");
      return;
    }

    setJoinError(null);
    setJoinErrorTitle("No pudimos unirte a la sala");
    setIsJoining(true);
    try {
      setConnectionMessage("Conectando a la sala...")
      const token = await getIdToken();
      const room = await joinRoomByCode(token, roomCode);
      setInviteCode("");
      navigate(`/room/${room.id}/lobby`);
    } catch (err: any) {
      const errorMessage = err?.message || "";

      setJoinErrorTitle("No pudimos unirte a la sala"); // Mantenemos el título por defecto

      // Evaluamos el texto del error
      if (errorMessage.includes("was not found")) {
        setJoinError("La sala con ese código no existe. Verifica e intenta de nuevo.");
      } else {
        setJoinError(errorMessage || "No pudimos unirnos a esa sala.");
      }
    } finally {
      setIsJoining(false);
      setConnectionMessage(null);
    }
  };

  const handleRemoveMembership = async (roomId: string) => {
    setJoinError(null);
    setJoinErrorTitle("No pudimos quitar la sala");
    setRemovingRoomId(roomId);
    try {
      const token = await getIdToken();
      await removeRoomMembership(token, roomId);
      emitRoomSocketEvent(token, ROOM_SOCKET_EVENTS.ROOM_MEMBER_REMOVED, roomId);
      removeRoomMembersLocally(roomId);
    } catch (err: any) {
      setJoinError(err?.message ?? "No pudimos quitar la sala del dashboard.");
    } finally {
      setRemovingRoomId(null);
    }
  };

  const handleConfirmLeaveRoom = async () => {
    if (!roomToLeave) return;

    const targetRoomId = roomToLeave.id;
    setRoomToLeave(null);
    await handleRemoveMembership(targetRoomId);
  };
  const handleCopyCode = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    navigator.clipboard.writeText(room.roomCode);
    setCopiedRoomId(room.id);

    setSrAnnouncement(`Código de sala ${room.name} copiado con éxito.`);

    setTimeout(() => {
      setCopiedRoomId(null);
      setSrAnnouncement("");
    }, 2000);
  };

  const handleOpenMembers = (room: Room) => {
    setMembersRoom(room);
  };

  const handleCreateSuccess = (roomId: string) => {
    setIsCreateModalOpen(false);
    navigate(`/room/${roomId}/lobby`);
  };

  const handleRoomDeleted = async () => {
    await refreshRooms();
  };

  useEffect(() => {
    return subscribeRoomsMembers(rooms);
  }, [rooms, subscribeRoomsMembers]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
      });
    } catch {
      return "Recientemente";
    }
  };

  const getRoomCover = (imageUrl?: string) => imageUrl ?? DEFAULT_ROOM_COVERS[0].src;

  const matchesSearch = (room: Room) =>
    room.name.toLowerCase().includes(searchQuery.trim().toLowerCase());

  const ownedRooms = rooms
    .filter((room) => room.ownerUid === firebaseUser?.uid)
    .filter(matchesSearch);

  const memberRooms = rooms
    .filter((room) => room.ownerUid !== firebaseUser?.uid)
    .filter(matchesSearch);

  const isTrulyEmpty = !loading && !error && rooms.length === 0;
  const hasSearch = searchQuery.trim().length > 0;
  const totalVisibleRooms = ownedRooms.length + memberRooms.length;
  const parsedInviteCode = parseRoomCodeFromInput(inviteCode);
  const hasInviteCodeValue = inviteCode.trim().length > 0;
  const isInviteCodeValid = isValidRoomCode(parsedInviteCode);
  const inviteCodeBorderClass = !hasInviteCodeValue
    ? "border-auth-input-border focus:ring-auth-btn"
    : isInviteCodeValid
      ? "border-auth-btn focus:ring-auth-btn"
      : "border-auth-error focus:ring-auth-error";

  const RoomCard = ({ room, isOwner }: { room: Room; isOwner: boolean }) => (
    <article
      aria-label={`Sala ${room.name}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface shadow-sm transition-all duration-300 hover:border-auth-btn/20 hover:shadow-md"
    >
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-auth-input-bg">
        <img
          src={getRoomCover(room.imageUrl)}
          alt={`Portada de sala ${room.name}`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute left-3 top-3 z-10">
          <div className="relative">
            {copiedRoomId === room.id && (
              <span
                className="absolute top-9 left-0 z-20 whitespace-nowrap rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-scale-up"
                aria-live="polite"
                role="status"
              >
                ¡Copiado con éxito!
              </span>
            )}
            <button
              type="button"
              onClick={(e) => handleCopyCode(e, room)}
              className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-auth-input-border/50 bg-auth-bg/80 backdrop-blur-sm px-2.5 py-1.5 text-xs font-mono font-bold text-auth-btn transition hover:border-auth-btn/40 hover:bg-auth-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
              aria-label={copiedRoomId === room.id ? "Código copiado" : `Copiar código de la sala ${room.name}`}
              title="Copiar código de la sala"
            >
              <span>{room.roomCode}</span>
              {copiedRoomId === room.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-500 transition-scale animate-scale-up" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 opacity-70 transition-opacity" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        <div className="absolute right-3 top-3 z-10">
          {isOwner ? (
            <RoomActionsMenu
              room={room}
              isOwner={isOwner}
              variant="card"
              onUpdated={(updatedRoom) => { updateRoomLocally(updatedRoom) }}
              onDeleted={handleRoomDeleted} />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRoomToLeave(room);
              }}
              disabled={removingRoomId === room.id}
              aria-label={`Quitar ${room.name} de mi dashboard`}
              title="Quitar de mi dashboard"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-auth-input-border/50 bg-auth-bg/80 text-auth-title backdrop-blur-sm transition hover:bg-auth-error/15 hover:text-auth-error disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
            >
              {removingRoomId === room.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between space-y-4 p-5">
        <div className="space-y-2">

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3
                className="line-clamp-1 text-base font-bold tracking-tight text-auth-title transition-colors group-hover:text-auth-btn"
                aria-label={`Nombre de la sala: ${room.name}`}
              >
                {room.name}
              </h3>
              <p
                className="text-xs text-auth-label"
                aria-label={`Fecha de creación: Creado el ${formatDate(room.createdAt)}`}
              >
                Creado el {formatDate(room.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-2 pt-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenMembers(room);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-auth-input-border/50 bg-auth-input-bg/70 px-2.5 py-1 text-xs font-medium text-auth-label transition hover:border-auth-btn/40 hover:text-auth-title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
              aria-label={`Ver miembros de ${room.name}`}
              title="Ver miembros"
            >
              <Users className="h-3 w-3 text-auth-label" aria-hidden="true" />
              <span>
                {membersLoading && !membersByRoomId[room.id]
                  ? "Cargando"
                  : `${membersByRoomId[room.id]?.length ?? 0} miembros`}
              </span>
              {membersLoading && !membersByRoomId[room.id] ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <Eye className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isOwner
                ? "border-auth-btn/25 bg-auth-btn/10 text-auth-btn"
                : "border-auth-input-border bg-auth-input-bg text-auth-label"
                }`}
              aria-label={isOwner ? "Rol: Anfitrión" : "Rol: Miembro"}
            >
              {isOwner ? "Anfitrión" : "Miembro"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/room/${room.id}/lobby`);
          }}
          aria-label={`Entrar a la sala ${room.name}`}
          className="h-10 w-full cursor-pointer rounded-xl bg-auth-btn text-sm font-semibold text-auth-btn-text shadow-sm transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
        >
          Entrar
        </button>
      </div>
    </article>
  );

  const renderRoomsGrid = (sectionRooms: Room[], isOwnerSection: boolean) => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {isOwnerSection && !hasSearch && (
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex aspect-[4/5] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-auth-input-border text-left shadow-sm transition duration-300 hover:border-auth-btn/50 hover:bg-auth-input-bg/10 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-auth-input-bg text-auth-label shadow-inner transition duration-300 group-hover:scale-110 group-hover:text-auth-btn">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-auth-label transition group-hover:text-auth-title">
            Nueva Sala
          </span>
        </button>
      )}
      {sectionRooms.map((room) => (
        <RoomCard key={room.id} room={room} isOwner={isOwnerSection} />
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-16 animate-fade-in">
      <header className="relative overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-md">
        <div className="pointer-events-none absolute right-0 top-0 -mr-16 -mt-10 h-32 w-80 rounded-full bg-auth-btn/5 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <UserAvatar
            src={avatarUrl}
            alt={displayName}
            size="xl"
            className="border-auth-btn/50 shadow-lg shadow-auth-btn/10"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-auth-label">
              Panel de Control
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-auth-title sm:text-3xl">
              ¡Hola de nuevo, {displayName.split(" ")[0]}!
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="text-sm font-semibold text-auth-btn">
                {username ? `@${username}` : profile?.email ?? firebaseUser?.email}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-auth-input-border" />
              <span className="rounded-full border border-auth-input-border bg-auth-input-bg px-2.5 py-0.5 text-xs font-medium text-auth-label">
                {rooms.length} {rooms.length === 1 ? "sala activa" : "salas activas"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface p-6 shadow-sm"
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
              Escribe el código de la sala para guardarla como miembro y entrar.
            </p>
          </div>
          <form
            onSubmit={handleJoinRoom}
            className="flex w-full max-w-md justify-end gap-2.5 flex-col md:flex-row"
          >
            <div>
            <label htmlFor="invite-code" className="sr-only">
              Código de la sala
            </label>
            <input
              id="invite-code"
              type="text"
              placeholder="Código de la sala"
              value={inviteCode}
              disabled={isJoining}
              onChange={(e) => {
                setInviteCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6));
                if (joinErrorTitle === "Código inválido") {
                  setJoinError(null);
                }
              }}
              aria-required="true"
              aria-invalid={hasInviteCodeValue && !isInviteCodeValid}
              maxLength={6}
              className={`h-14 w-full flex-1 rounded-xl border bg-auth-input-bg/40 px-4 text-sm font-semibold tracking-[0.08em] text-auth-title transition focus:outline-none focus:ring-2 ${inviteCodeBorderClass}`}
            />
            </div>

            <button
              type="submit"
              disabled={!isInviteCodeValid || isJoining}
              className="flex h-14 cursor-pointer items-center gap-2 rounded-xl bg-auth-btn px-5 text-sm font-semibold text-auth-btn-text shadow-md transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
            >
              <span>{isJoining ? "Uniendo" : "Unirse"}</span>
              {isJoining ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </form>
          {connectionMessage && (
            <p
              className="text-sm font-medium text-auth-btn"
              role="status">
              {connectionMessage}
            </p>
          )}
        </div>
      </section>

      {!isTrulyEmpty && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <label htmlFor="room-search" className="sr-only">
              Buscar salas
            </label>
            <input
              id="room-search"
              type="search"
              placeholder="Buscar salas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-xl border border-auth-input-border bg-auth-surface py-2 pl-9 pr-4 text-sm text-auth-title shadow-sm transition placeholder:text-auth-label focus:border-transparent focus:outline-none focus:ring-2 focus:ring-auth-btn"
            />
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-auth-label"
              aria-hidden="true"
            >
              <Search className="h-4 w-4 opacity-70" />
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-busy="true"
          aria-live="polite"
          role="status"
          aria-label="Cargando salas"
        >
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="overflow-hidden rounded-2xl border border-auth-input-border bg-auth-surface shadow-sm animate-pulse"
            >
              <div className="aspect-video w-full bg-auth-input-bg/50" />
              <div className="space-y-4 p-5">
                <div className="h-4 w-2/3 rounded bg-auth-input-bg/50" />
                <div className="h-3 w-1/2 rounded bg-auth-input-bg/50" />
                <div className="h-10 rounded-xl bg-auth-input-bg/50" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          className="mx-auto max-w-xl space-y-5 rounded-2xl border border-auth-error/20 bg-auth-error/5 px-6 py-12 text-center shadow-sm animate-scale-up"
          role="alert"
        >
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-auth-error/10 text-auth-error"
            aria-hidden="true"
          >
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-auth-title">Error de Conexión</h3>
            <p className="text-sm text-auth-label">
              Ocurrió un error con el servidor, por favor intenta más tarde.
              Error: {error}
            </p>
          </div>
          <button
            onClick={refreshRooms}
            className="cursor-pointer rounded-xl bg-auth-error px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-auth-error/15 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-error focus-visible:ring-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : isTrulyEmpty ? (
        <div
          className="relative flex min-h-[min(300px)] flex-col items-center justify-center overflow-hidden rounded-3xl border border-auth-input-border bg-auth-surface px-6 py-8 text-center shadow-sm animate-scale-up"
          role="status"
          aria-labelledby="empty-rooms-title"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-auth-btn/8 via-transparent to-auth-link/5"
          />
          <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-auth-btn/20 bg-auth-btn/10 text-auth-btn shadow-lg shadow-auth-btn/10">
            <LayoutGrid className="h-11 w-11" strokeWidth={1.75} />
          </div>

          <div className="relative max-w-md space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-auth-label">
              Sin espacios todavía
            </p>
            <h3
              id="empty-rooms-title"
              className="text-3xl font-extrabold tracking-tight text-auth-title sm:text-4xl"
            >
              Aún no tienes salas
            </h3>
            <p className="mx-auto max-w-md text-base leading-relaxed text-auth-label sm:text-lg">
              Crea tu primer espacio de trabajo o únete a una sala existente con su código.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="relative mt-3 inline-flex h-12 cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-auth-btn px-8 text-base font-semibold text-auth-btn-text shadow-lg shadow-auth-btn/20 transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Crear mi primer espacio
          </button>
        </div>
      ) : totalVisibleRooms === 0 ? (
        <div className="mx-auto max-w-xl space-y-5 rounded-2xl border border-auth-input-border bg-auth-surface px-6 py-12 text-center shadow-sm">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-auth-btn/10 text-auth-btn"
            aria-hidden="true"
          >
            <Compass className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-auth-title">No se encontraron salas</h3>
            <p className="text-sm text-auth-label">
              Prueba buscando con otro término.
            </p>
          </div>
          <button
            onClick={() => setSearchQuery("")}
            className="cursor-pointer rounded-xl bg-auth-btn px-5 py-2 text-xs font-semibold text-auth-btn-text transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="owned-rooms-title" className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2
                  id="owned-rooms-title"
                  className="text-2xl font-bold tracking-tight text-auth-title"
                >
                  Mis salas
                </h2>
                <p className="mt-1 text-sm text-auth-label">
                  Salas que creaste y administras.
                </p>
              </div>
            </div>
            {ownedRooms.length > 0 ? (
              renderRoomsGrid(ownedRooms, true)
            ) : !hasSearch ? (
              <EmptySection
                icon={LayoutGrid}
                title="Aún no has creado salas"
                message="Tus salas propias aparecerán aquí para que puedas administrarlas, editar su portada y entrar rápido."
                action={
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-auth-btn px-5 text-sm font-semibold text-auth-btn-text transition hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Crear sala
                  </button>
                }
              />
            ) : (
              <EmptySection
                icon={Search}
                title="Sin coincidencias en tus salas"
                message="No encontramos salas propias con ese término. Prueba con otra búsqueda o limpia el campo."
              />
            )}
          </section>

          <section aria-labelledby="member-rooms-title" className="space-y-5">
            <div>
              <h2
                id="member-rooms-title"
                className="text-2xl font-bold tracking-tight text-auth-title"
              >
                Salas en las que soy miembro
              </h2>
              <p className="mt-1 text-sm text-auth-label">
                Salas a las que te uniste escribiendo su código.
              </p>
            </div>
            {memberRooms.length > 0 ? (
              renderRoomsGrid(memberRooms, false)
            ) : !hasSearch ? (
              <EmptySection
                icon={UserRoundPlus}
                title="Todavía no eres miembro de ninguna sala"
                message="Cuando escribas el código de una sala y te unas, aparecerá aquí separada de tus salas propias."
                action={
                  <button
                    type="button"
                    onClick={() => document.getElementById("invite-code")?.focus()}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-auth-input-border bg-auth-input-bg px-5 text-sm font-semibold text-auth-title transition hover:border-auth-btn/40 hover:bg-auth-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn"
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    Unirme con código
                  </button>
                }
              />
            ) : (
              <EmptySection
                icon={Search}
                title="Sin coincidencias como miembro"
                message="No encontramos salas donde seas miembro con ese término. Intenta una búsqueda más amplia."
              />
            )}
          </section>
        </div>
      )}

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <BaseModal
        isOpen={!!membersRoom}
        onClose={() => {
          setMembersRoom(null);
        }}
        title={membersRoom ? `Miembros de ${membersRoom.name}` : "Miembros"}
      >
        <div className="space-y-4">
          {membersRoom && membersLoading && !membersByRoomId[membersRoom.id] ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-auth-label">
              <Loader2 className="h-4 w-4 animate-spin text-auth-btn" aria-hidden="true" />
              Cargando miembros...
            </div>
          ) : membersError ? (
            <div className="rounded-xl border border-auth-error/20 bg-auth-error/5 px-4 py-3 text-sm text-auth-error">
              {membersError}
            </div>
          ) : !membersRoom || (membersByRoomId[membersRoom.id]?.length ?? 0) === 0 ? (
            <EmptySection
              icon={Users}
              title="Sin miembros todavía"
              message="Cuando alguien se una con el código de la sala, aparecerá en esta lista."
            />
          ) : (
            <ul className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {(membersByRoomId[membersRoom.id] ?? []).map((member) => {
                const isOwner = member.uid === membersRoom?.ownerUid;
                return (
                  <li
                    key={member.uid}
                    className="flex items-center gap-3 rounded-xl border border-auth-input-border bg-auth-input-bg/40 px-3 py-2.5"
                  >
                    <UserAvatar
                      src={member.avatarUrl}
                      alt={member.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-auth-title">
                        {member.displayName}
                      </p>
                      <p className="truncate text-xs text-auth-label">
                        {member.username ? `@${member.username}` : member.email ?? member.uid}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${isOwner
                        ? "border-auth-btn/25 bg-auth-btn/10 text-auth-btn"
                        : "border-auth-input-border bg-auth-surface text-auth-label"
                        }`}
                    >
                      {isOwner ? "Anfitrión" : "Miembro"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </BaseModal>

      <BaseModal
        isOpen={!!roomToLeave}
        onClose={() => setRoomToLeave(null)}
        title="Confirmar acción"
      >
        <div className="space-y-6 py-2">
          <div className="flex items-center gap-3 rounded-xl border border-auth-error/20 bg-auth-error/5 p-4 text-sm text-auth-title">
            <AlertCircle className="h-5 w-5 shrink-0 text-auth-error" aria-hidden="true" />
            <p>
              ¿Estás seguro que quieres dejar de ser miembro de la sala{" "}
              <span className="font-bold text-auth-btn">"{roomToLeave?.name}"</span>?
            </p>
          </div>

          <p className="text-xs leading-relaxed text-auth-label">
            Al salir, esta sala se quitará de tu panel. Si deseas volver a ingresar en el futuro, necesitarás que te compartan el código de acceso de nuevo.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setRoomToLeave(null)}
              className="h-10 cursor-pointer rounded-xl border border-auth-input-border bg-transparent px-4 text-sm font-semibold text-auth-title transition hover:bg-auth-input-bg/50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmLeaveRoom}
              className="h-10 cursor-pointer rounded-xl bg-auth-error px-5 text-sm font-semibold text-white shadow-md shadow-auth-error/10 transition hover:brightness-110 active:scale-[0.98]"
            >
              Confirmar y Salir
            </button>
          </div>
        </div>
      </BaseModal>

      <WarningModal
        isOpen={roomDeletedWarningOpen}
        onClose={handleRoomDeletedWarningClose}
        message={ROOM_DELETED_DASHBOARD_NOTICE.message}
      />

      <WarningModal
        isOpen={roomKickedWarningOpen}
        onClose={handleRoomKickedWarningClose}
        message={ROOM_KICKED_DASHBOARD_NOTICE.message}
      />

      <ErrorModal
        isOpen={!!joinError}
        onClose={() => setJoinError(null)}
        title={joinErrorTitle}
        message={joinError ?? ""}
      />
      <div className="sr-only" aria-live="polite" role="status">
        {srAnnouncement}
      </div>
    </div>
  );
}
