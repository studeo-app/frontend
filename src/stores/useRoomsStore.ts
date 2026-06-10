import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { getMyRooms, getMyRoomsMembers } from "@/modules/rooms/api/roomsApi";
import type { Room, RoomMember } from "@/types/room";

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  membersByRoomId: Record<string, RoomMember[]>;
  membersLoading: boolean;
  membersError: string | null;
  membersCacheKey: string;
  fetchRooms: (force?: boolean) => Promise<void>;
  fetchRoomsMembers: (rooms: Room[], force?: boolean) => Promise<void>;
  addRoomLocally: (room: Room) => void;
  updateRoomLocally: (room: Room) => void;
  removeRoomLocally: (roomId: string) => void;
  removeRoomMembersLocally: (roomId: string) => void;
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  loading: false,
  error: null,
  lastFetched: null,
  membersByRoomId: {},
  membersLoading: false,
  membersError: null,
  membersCacheKey: "",
  fetchRooms: async (force = false) => {
    if (get().loading) return;

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ rooms: [], loading: false });
      return;
    }

    // Cache check (120 seconds TTL)
    const now = Date.now();
    const lastFetched = get().lastFetched;
    if (!force && get().rooms.length > 0 && lastFetched && (now - lastFetched < 30000)) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const token = await useAuthStore.getState().getIdToken();
      const data = await getMyRooms(token);
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      set({ rooms: sorted, loading: false, lastFetched: Date.now() });
    } catch (err: any) {
      set({ error: err?.message ?? "Error al obtener las salas", loading: false });
    }
  },
  fetchRoomsMembers: async (rooms, force = false) => {
    const roomsCacheKey = rooms.map((room) => room.id).sort().join("|");

    if (rooms.length === 0) {
      set({ membersByRoomId: {}, membersLoading: false, membersError: null, membersCacheKey: "" });
      return;
    }

    if (get().membersLoading) return;

    if (!force && get().membersCacheKey === roomsCacheKey) {
      return;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      set({ membersByRoomId: {}, membersLoading: false, membersError: null, membersCacheKey: "" });
      return;
    }

    set({ membersLoading: true, membersError: null });

    try {
      const token = await useAuthStore.getState().getIdToken();
      const membersMap = await getMyRoomsMembers(token);
      const normalizedMembersMap = Object.fromEntries(
        rooms.map((room) => [room.id, membersMap[room.id] ?? []]),
      );

      set((state) => ({
        membersByRoomId: {
          ...state.membersByRoomId,
          ...normalizedMembersMap,
        },
        membersLoading: false,
        membersError: null,
        membersCacheKey: roomsCacheKey,
      }));
    } catch (err: any) {
      set({
        membersError: err?.message ?? "No pudimos cargar los miembros de las salas.",
        membersLoading: false,
        membersCacheKey: roomsCacheKey,
      });
    }
  },
  addRoomLocally: (room) => {
    set((state) => {
      const updated = [room, ...state.rooms].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return { rooms: updated };
    });
  },
  updateRoomLocally: (room) => {
    set((state) => ({
      rooms: state.rooms
        .map((r) => (r.id === room.id ? room : r))
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    }));
  },
  removeRoomLocally: (roomId) => {
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
    }));
  },
  removeRoomMembersLocally: (roomId) => {
    set((state) => {
      const nextMembers = { ...state.membersByRoomId };
      delete nextMembers[roomId];
      return {
        membersByRoomId: nextMembers,
        membersCacheKey: state.rooms
          .filter((room) => room.id !== roomId)
          .map((room) => room.id)
          .sort()
          .join("|"),
      };
    });
  },
}));
