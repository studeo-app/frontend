/** Participante ya presente en la sala (vista lobby, antes de unirse). */
export interface LobbyWaitingParticipant {
  id: string
  displayName: string
  initials: string
  avatarColor: string
  avatarUrl?: string
}

export interface MediaDeviceOption {
  deviceId: string
  label: string
}
