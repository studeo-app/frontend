import { useState } from 'react'
import { getApiErrorMessage } from '@/shared/api/apiError'
import { connectSocket } from '@/config/socket.config'
import { useAuthStore } from '@/stores/useAuthStore'
import { deleteRoom } from '../api/roomsApi'
import { ROOM_SOCKET_EVENTS } from '../constants/socketEvents'

function emitDeleteRoom(token: string, roomId: string): Promise<void> {
  const socket = connectSocket(token)

  return new Promise((resolve) => {
    const emit = () => {
      socket.emit(ROOM_SOCKET_EVENTS.DELETE_ROOM, { roomId })
      resolve()
    }

    if (socket.connected) {
      emit()
      return
    }

    socket.once(ROOM_SOCKET_EVENTS.CONNECT, emit)
    window.setTimeout(resolve, 1500)
  })
}

export function useDeleteRoom() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState(false)
  const getIdToken = useAuthStore((s) => s.getIdToken)

  const startDeleteRoom = async (roomId: string) => {
    setIsDeleting(true)
    setErrorMsg(null)
    setDeleteSuccess(false)

    try {
      const token = await getIdToken()
      await emitDeleteRoom(token, roomId)
      await deleteRoom(token, roomId)
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
