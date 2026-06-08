import { io, type Socket } from 'socket.io-client'

const REALTIME_URL =
  (import.meta.env.VITE_REALTIME_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3001'

let socket: Socket | null = null
let socketToken: string | null = null

/**
 * Conecta (o reconecta) al backend-realtime enviando el Firebase ID Token
 * en el handshake para que el middleware lo valide.
 */
export function connectSocket(token: string): Socket {
  if (socket && socketToken === token) {
    if (!socket.connected && socket.disconnected) {
      socket.connect()
    }
    return socket
  }

  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
  }

  socketToken = token
  socket = io(REALTIME_URL, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket', 'polling'],
  })

  socket.connect()
  return socket
}

/**
 * Desconecta el socket y limpia la referencia.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
    socketToken = null
  }
}

/**
 * Devuelve la instancia actual del socket (puede ser null si no se ha conectado).
 */
export function getSocket(): Socket | null {
  return socket
}
