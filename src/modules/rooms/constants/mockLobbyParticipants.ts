import type { LobbyWaitingParticipant } from '../types/lobby'

/** Participantes en sala — sustituir por evento WebSocket `room-participants` */
export const MOCK_LOBBY_WAITING_PARTICIPANTS: LobbyWaitingParticipant[] = [
  { id: 'user-david', displayName: 'David P.', initials: 'D', avatarColor: 'bg-violet-600' },
  { id: 'user-sofia', displayName: 'Sofía R.', initials: 'S', avatarColor: 'bg-emerald-600' },
  { id: 'user-juan', displayName: 'Juan C.', initials: 'J', avatarColor: 'bg-zinc-600' },
  { id: 'user-maria', displayName: 'Maria L.', initials: 'M', avatarColor: 'bg-orange-500' },
  { id: 'user-carla', displayName: 'Carla M.', initials: 'C', avatarColor: 'bg-sky-600' },
  { id: 'user-pedro', displayName: 'Pedro S.', initials: 'P', avatarColor: 'bg-rose-600' },
  { id: 'user-laura', displayName: 'Laura G.', initials: 'L', avatarColor: 'bg-amber-600' },
  { id: 'user-ana', displayName: 'Ana V.', initials: 'A', avatarColor: 'bg-teal-600' },
]

export const MOCK_MIC_DEVICES = [
  { deviceId: 'default', label: 'Predeterminado - Micrófono' },
  { deviceId: 'mic-1', label: 'Micrófono (Realtek Audio)' },
  { deviceId: 'mic-2', label: 'Auriculares Bluetooth' },
]

export const MOCK_CAMERA_DEVICES = [
  { deviceId: 'cam-1', label: 'Cámara Web HD' },
  { deviceId: 'cam-2', label: 'Cámara integrada' },
  { deviceId: 'cam-3', label: 'OBS Virtual Camera' },
]
