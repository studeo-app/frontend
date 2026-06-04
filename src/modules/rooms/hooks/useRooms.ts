import { useEffect } from "react";
import { useRoomsStore } from "@/stores/useRoomsStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function useRooms() {
  const { rooms, loading, error, fetchRooms } = useRoomsStore();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      fetchRooms();
    }
  }, [user, fetchRooms]);

  return { rooms, loading, error, refreshRooms: () => fetchRooms(true) };
}
