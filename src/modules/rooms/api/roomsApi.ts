import { apiRequest } from "@/shared/api/apiClient";
import type { Room, CreateRoomPayload } from "@/types/room";

export async function checkBackendHealth(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/health");
}

export async function getMyRooms(token: string): Promise<Room[]> {
  return apiRequest<Room[]>("/rooms/my-rooms", {
    token,
  });
}

export async function createRoom(token: string, payload: CreateRoomPayload): Promise<Room> {
  return apiRequest<Room>("/rooms", {
    method: "POST",
    token,
    body: payload,
  });
}

export async function deleteRoom(token: string, roomId: string): Promise<{ deleted: boolean; message: string }> {
  return apiRequest<{ deleted: boolean; message: string }>(`/rooms/${roomId}`, {
    method: "DELETE",
    token,
  });
}
