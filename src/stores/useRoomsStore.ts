import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { getMyRooms } from "@/modules/rooms/api/roomsApi";
import type { Room } from "@/types/room";

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  fetchRooms: (force?: boolean) => Promise<void>;
  addRoomLocally: (room: Room) => void;
  updateRoomLocally: (room: Room) => void;
  removeRoomLocally: (roomId: string) => void;
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  loading: false,
  error: null,
  lastFetched: null,
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
    if (!force && get().rooms.length > 0 && lastFetched && (now - lastFetched < 120000)) {
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
}));
