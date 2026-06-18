export const ROOM_DELETED_REASON = 'OWNER_DELETED_ROOM'

export const ROOM_DELETED_DASHBOARD_NOTICE = {
  stateKey: 'roomDeletedByOwner',
  message: 'Fuiste desconectado porque la sala fue eliminada por el dueño.',
} as const

export interface RoomDeletedDashboardState {
  [ROOM_DELETED_DASHBOARD_NOTICE.stateKey]?: boolean
}

export function createRoomDeletedDashboardState(): RoomDeletedDashboardState {
  return {
    [ROOM_DELETED_DASHBOARD_NOTICE.stateKey]: true,
  }
}

export function hasRoomDeletedDashboardNotice(
  state: unknown,
): state is RoomDeletedDashboardState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as RoomDeletedDashboardState)[ROOM_DELETED_DASHBOARD_NOTICE.stateKey] === true
  )
}

export const ROOM_KICKED_DASHBOARD_NOTICE = {
  stateKey: 'roomKickedByHost',
  message: 'Fuiste expulsado de la sala por el anfitrión.',
} as const

export interface RoomKickedDashboardState {
  [ROOM_KICKED_DASHBOARD_NOTICE.stateKey]?: boolean
}

export function createRoomKickedDashboardState(): RoomKickedDashboardState {
  return {
    [ROOM_KICKED_DASHBOARD_NOTICE.stateKey]: true,
  }
}

export function hasRoomKickedDashboardNotice(
  state: unknown,
): state is RoomKickedDashboardState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as RoomKickedDashboardState)[ROOM_KICKED_DASHBOARD_NOTICE.stateKey] === true
  )
}


