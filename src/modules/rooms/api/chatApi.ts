import { apiRequest } from '@/shared/api/apiClient'

export interface ChatMessageDTO {
  id: string
  uid: string
  username: string
  avatarUrl?: string | null
  text: string
  timestamp: string
}

export interface PaginatedMessagesResponse {
  messages: ChatMessageDTO[]
  nextCursor: string | null
  hasMore: boolean
}

/**
 * Obtiene el historial de mensajes de una sala desde el backend NestJS.
 * Soporta paginación por cursor — pasa el `nextCursor` de la respuesta anterior
 * para obtener la siguiente página de mensajes más antiguos.
 */
export async function getRoomMessages(
  token: string,
  roomId: string,
  cursor?: string,
): Promise<PaginatedMessagesResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  return apiRequest<PaginatedMessagesResponse>(
    `/rooms/${roomId}/messages${query}`,
    { token },
  )
}
