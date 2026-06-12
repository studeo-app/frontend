export const ROOM_SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  NEW_USER: 'newUser',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  DELETE_ROOM: 'deleteRoom',
  ROOM_DELETED: 'roomDeleted',
  ROOM_USERS: 'roomUsers',
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_ERROR: 'message:error',
  ERROR_MESSAGE: 'errorMessage',
} as const

