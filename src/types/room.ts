export interface Room {
  id: string;
  roomCode: string;
  name: string;
  ownerUid: string;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface CreateRoomPayload {
  name: string;
  imageUrl?: string;
}

export interface UpdateRoomPayload {
  name?: string;
  imageUrl?: string;
}

export interface RoomMember {
  id: string;
  roomId: string;
  uid: string;
  joinedAt: string;
  displayName: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
}
