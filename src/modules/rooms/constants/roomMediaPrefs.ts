export const getRoomLobbyMediaPrefsKey = (roomId: string) => `studeo:room-lobby-media:${roomId}`

export interface RoomLobbyMediaPrefs {
  isMicOn: boolean
  isCameraOn: boolean
  selectedMicId: string
  selectedCameraId: string
}

export function readRoomLobbyMediaPrefs(roomId: string): RoomLobbyMediaPrefs | null {
  const rawPrefs = sessionStorage.getItem(getRoomLobbyMediaPrefsKey(roomId))
  if (!rawPrefs) return null

  try {
    const parsed = JSON.parse(rawPrefs) as Partial<RoomLobbyMediaPrefs>
    return {
      isMicOn: Boolean(parsed.isMicOn),
      isCameraOn: Boolean(parsed.isCameraOn),
      selectedMicId: parsed.selectedMicId ?? '',
      selectedCameraId: parsed.selectedCameraId ?? '',
    }
  } catch {
    return null
  }
}
