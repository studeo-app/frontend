import { useEffect, useState } from "react";
import { useRoomsStore } from "@/stores/useRoomsStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function useRooms() {
  const { rooms, loading, error, subscribeRooms } = useRoomsStore();
  const user = useAuthStore((state) => state.user);
  const [subscriptionVersion, setSubscriptionVersion] = useState(0);

  useEffect(() => {
    if (!user) return;

    return subscribeRooms(user.uid);
  }, [user, subscribeRooms, subscriptionVersion]);

  return {
    rooms,
    loading,
    error,
    refreshRooms: () => setSubscriptionVersion((version) => version + 1),
  };
}
