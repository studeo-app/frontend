export interface Room {
  id: string;
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
