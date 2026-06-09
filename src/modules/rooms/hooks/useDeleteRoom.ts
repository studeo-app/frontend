import { useState } from 'react'
import { getApiErrorMessage } from '@/shared/api/apiError'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRoomsStore } from '@/stores/useRoomsStore'
import { deleteRoom } from '../api/roomsApi'

export function useDeleteRoom() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const removeRoomLocally = useRoomsStore((s) => s.removeRoomLocally)
  const getIdToken = useAuthStore((s) => s.getIdToken)

  const startDeleteRoom = async (roomId: string) => {
    setIsDeleting(true)
    setErrorMsg(null)
    setDeleteSuccess(false)

    try {
      const token = await getIdToken()
      await deleteRoom(token, roomId)
      //removeRoomLocally(roomId)
      setDeleteSuccess(true)
    } catch (err: unknown) {
      const message = getApiErrorMessage(
        err,
        'No pudimos eliminar la sala. Inténtalo de nuevo.',
      )
      setErrorMsg(message)
      throw err
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    startDeleteRoom,
    isDeleting,
    errorMsg,
    setErrorMsg,
    deleteSuccess,
    setDeleteSuccess,
  }
}
