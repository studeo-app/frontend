import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '@/shared/api/apiError'
import { useAuthStore } from '@/stores/useAuthStore'
import { getRoomById } from '../api/roomsApi'
import type { Room } from '@/types/room'

interface UseRoomResult {
  room: Room | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  setRoom: (room: Room) => void
}

export function useRoom(roomId: string): UseRoomResult {
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRoom = useCallback(async () => {
    if (!roomId) {
      setRoom(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await useAuthStore.getState().getIdToken()
      const data = await getRoomById(token, roomId)
      setRoom(data)
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudo cargar la sala.'))
      setRoom(null)
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  return { room, loading, error, refresh: fetchRoom, setRoom }
}
