import { useState } from 'react'
import { getApiErrorMessage } from '@/shared/api/apiError'
import { useAuthStore } from '@/stores/useAuthStore'
import { useRoomsStore } from '@/stores/useRoomsStore'
import {
  CloudinaryUploadError,
  uploadImageToCloudinary,
} from '@/modules/media/cloudinary/uploadImage'
import { updateRoom } from '../api/roomsApi'
import type { Room } from '@/types/room'

interface UpdateRoomParams {
  name: string
  imageFile?: File | null
  imageUrl?: string
}

function resolveUpdateRoomError(error: unknown): string {
  if (error instanceof CloudinaryUploadError) {
    return error.message
  }

  return getApiErrorMessage(
    error,
    'No pudimos actualizar la sala. Inténtalo de nuevo.',
  )
}

export function useUpdateRoom() {
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [updatedRoom, setUpdatedRoom] = useState<Room | null>(null)
  const updateRoomLocally = useRoomsStore((s) => s.updateRoomLocally)
  const getIdToken = useAuthStore((s) => s.getIdToken)

  const startUpdateRoom = async (roomId: string, params: UpdateRoomParams) => {
    setIsUpdating(true)
    setErrorMsg(null)
    setUpdatedRoom(null)

    try {
      const token = await getIdToken()
      let finalImageUrl = params.imageUrl

      if (params.imageFile) {
        const uploadRes = await uploadImageToCloudinary(params.imageFile, 'ROOMS')
        finalImageUrl = uploadRes.secureUrl
      }

      const room = await updateRoom(token, roomId, {
        name: params.name,
        ...(finalImageUrl !== undefined ? { imageUrl: finalImageUrl } : {}),
      })

      //updateRoomLocally(room)
      setUpdatedRoom(room)
      return room
    } catch (err: unknown) {
      const message = resolveUpdateRoomError(err)
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
