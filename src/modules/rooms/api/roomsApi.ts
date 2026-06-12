import { apiRequest } from "@/shared/api/apiClient";
import type { Room, CreateRoomPayload, UpdateRoomPayload, RoomMember } from "@/types/room";

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

export async function getRoomById(token: string, roomId: string): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}`, {
    token,
  });
}

export async function joinRoomByCode(token: string, roomCode: string): Promise<Room> {
  return apiRequest<Room>("/rooms/join", {
    method: "POST",
    token,
    body: { roomCode },
  });
}

export async function getRoomMembers(token: string, roomId: string): Promise<RoomMember[]> {
  return apiRequest<RoomMember[]>(`/rooms/${roomId}/members`, {
    token,
  });
}

export async function getMyRoomsMembers(token: string): Promise<Record<string, RoomMember[]>> {
  return apiRequest<Record<string, RoomMember[]>>("/rooms/my-rooms/members", {
    token,
  });
}

export async function updateRoom(
  token: string,
  roomId: string,
  payload: UpdateRoomPayload,
): Promise<Room> {
  return apiRequest<Room>(`/rooms/${roomId}`, {
    method: "PATCH",
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

export async function removeRoomMembership(
  token: string,
  roomId: string,
): Promise<{ removed: boolean; message: string }> {
  return apiRequest<{ removed: boolean; message: string }>(`/rooms/${roomId}/membership`, {
    method: "DELETE",
    token,
  });
}
