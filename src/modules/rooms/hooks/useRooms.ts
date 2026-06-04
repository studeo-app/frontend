import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { getMyRooms } from "../api/roomsApi";
import type { Room } from "@/types/room";

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getIdToken = useAuthStore((state) => state.getIdToken);
  const user = useAuthStore((state) => state.user);

  const fetchRooms = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const data = await getMyRooms(token);
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRooms(sorted);
    } catch (err: any) {
      setError(err?.message ?? "Error al obtener las salas");
    } finally {
      setLoading(false);
    }
  }, [getIdToken, user]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, error, refreshRooms: fetchRooms };
}
