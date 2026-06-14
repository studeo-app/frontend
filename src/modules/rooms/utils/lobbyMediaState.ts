import type { LocalMediaState } from '../types/roomSession'

const STORAGE_PREFIX = 'studeo:lobby-media:'

export const DEFAULT_LOBBY_MEDIA: LocalMediaState = {
  isMicOn: true,
  isCameraOn: true,
  isScreenSharing: false,
}

function storageKey(roomId: string): string {
  return `${STORAGE_PREFIX}${roomId}`
}

export function readLobbyMediaState(roomId: string): LocalMediaState {
  if (!roomId || typeof window === 'undefined') return DEFAULT_LOBBY_MEDIA

  try {
    const raw = window.sessionStorage.getItem(storageKey(roomId))
    if (!raw) return DEFAULT_LOBBY_MEDIA

    const parsed = JSON.parse(raw) as Partial<LocalMediaState>
    return {
      isMicOn: parsed.isMicOn ?? DEFAULT_LOBBY_MEDIA.isMicOn,
      isCameraOn: parsed.isCameraOn ?? DEFAULT_LOBBY_MEDIA.isCameraOn,
      isScreenSharing: parsed.isScreenSharing ?? DEFAULT_LOBBY_MEDIA.isScreenSharing,
    }
  } catch {
    return DEFAULT_LOBBY_MEDIA
  }
}

export function writeLobbyMediaState(roomId: string, media: LocalMediaState): void {
  if (!roomId || typeof window === 'undefined') return

  window.sessionStorage.setItem(storageKey(roomId), JSON.stringify(media))
}
