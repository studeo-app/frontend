import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  MOCK_CAMERA_DEVICES,
  MOCK_MIC_DEVICES,
} from '../constants/mockLobbyParticipants'
import type { LocalMediaState } from '../types/roomSession'

interface UseRoomLobbyResult {
  localMedia: LocalMediaState
  selectedMicId: string
  selectedCameraId: string
  micDevices: typeof MOCK_MIC_DEVICES
  cameraDevices: typeof MOCK_CAMERA_DEVICES
  toggleMic: () => void
  toggleCamera: () => void
  setSelectedMicId: (id: string) => void
  setSelectedCameraId: (id: string) => void
  joinRoom: () => void
}

/**
 * Estado de la sala de espera (lobby) antes de unirse.
 * Dispositivos mock → sustituir por navigator.mediaDevices.enumerateDevices().
 */
export function useRoomLobby(roomId: string): UseRoomLobbyResult {
  const navigate = useNavigate()

  const [localMedia, setLocalMedia] = useState<LocalMediaState>({
    isMicOn: true,
    isCameraOn: true,
    isScreenSharing: false,
  })

  const [selectedMicId, setSelectedMicId] = useState(MOCK_MIC_DEVICES[0].deviceId)
  const [selectedCameraId, setSelectedCameraId] = useState(MOCK_CAMERA_DEVICES[0].deviceId)

  const toggleMic = useCallback(() => {
    setLocalMedia((prev) => ({ ...prev, isMicOn: !prev.isMicOn }))
  }, [])

  const toggleCamera = useCallback(() => {
    setLocalMedia((prev) => ({ ...prev, isCameraOn: !prev.isCameraOn }))
  }, [])

  const joinRoom = useCallback(() => {
    // TODO: socket.emit('join-room', { roomId, media: localMedia, devices: { mic, camera } })
    navigate(`/room/${roomId}`)
  }, [navigate, roomId])

  return {
    localMedia,
    selectedMicId,
    selectedCameraId,
    micDevices: MOCK_MIC_DEVICES,
    cameraDevices: MOCK_CAMERA_DEVICES,
    toggleMic,
    toggleCamera,
    setSelectedMicId,
    setSelectedCameraId,
    joinRoom,
  }
}
