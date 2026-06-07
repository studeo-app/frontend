import { useState } from 'react'
import { getApiErrorMessage } from '@/shared/api/apiError'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRoomsStore } from '@/stores/useRoomsStore'
import { updateRoom } from '../api/roomsApi'
import type { Room } from '@/types/room'

export function useUpdateRoom() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [updatedRoom, setUpdatedRoom] = useState<Room | null>(null)
  const updateRoomLocally = useRoomsStore((s) => s.updateRoomLocally)
  const getIdToken = useAuthStore((s) => s.getIdToken)

  const startUpdateRoom = async (roomId: string, name: string) => {
    setIsUpdating(true)
    setErrorMsg(null)
    setUpdatedRoom(null)

    try {
      const token = await getIdToken()
      const room = await updateRoom(token, roomId, { name })
      updateRoomLocally(room)
      setUpdatedRoom(room)
      return room
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        'No pudimos actualizar la sala. Inténtalo de nuevo.',
      )
      setErrorMsg(message)
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  return {
    startUpdateRoom,
    isUpdating,
    errorMsg,
    setErrorMsg,
    updatedRoom,
    setUpdatedRoom,
  }
}
