# Studeo Frontend

Aplicacion web del salon de estudio colaborativo Studeo. Esta capa implementa la experiencia de usuario: autenticacion, completar perfil, dashboard de salas, lobby multimedia y sala en tiempo real con chat, audio, video, pantalla compartida, reacciones y moderacion.

## Tabla de contenidos

1. [Rol dentro del sistema](#rol-dentro-del-sistema)
2. [Stack principal](#stack-principal)
3. [Arquitectura de carpetas](#arquitectura-de-carpetas)
4. [Variables de entorno](#variables-de-entorno)
5. [Scripts](#scripts)
6. [Flujo de autenticacion](#flujo-de-autenticacion)
7. [Flujo de salas](#flujo-de-salas)
8. [Realtime, WebRTC y P2P](#realtime-webrtc-y-p2p)
9. [Media, pantalla y dispositivos](#media-pantalla-y-dispositivos)
10. [Estado local y comunicacion con APIs](#estado-local-y-comunicacion-con-apis)
11. [Rutas de la aplicacion](#rutas-de-la-aplicacion)
12. [Integraciones externas](#integraciones-externas)
13. [Verificacion y calidad](#verificacion-y-calidad)
14. [Relacion con backend y backend-realtime](#relacion-con-backend-y-backend-realtime)

## Rol dentro del sistema

El frontend es una SPA construida con React y Vite. Consume dos servicios:

- `backend`: API REST NestJS para usuarios, salas, perfiles e historial de mensajes.
- `backend-realtime`: Socket.IO para presencia, chat en vivo, moderacion y senalizacion WebRTC.

Los streams de audio, video y pantalla no pasan por los backends. Se negocian desde el frontend mediante WebRTC y viajan navegador a navegador, o por TURN cuando ICE lo requiere.

## Stack principal

| Tecnologia | Uso |
|---|---|
| React 19 | UI declarativa y componentes |
| Vite 8 | Dev server y build |
| TypeScript | Tipado estatico |
| React Router 7 | Rutas protegidas, publicas y de sala |
| Zustand | Estado global de auth, rooms y tema |
| Firebase Auth | Login/registro con correo y Google |
| Socket.IO Client | Conexion realtime con `backend-realtime` |
| WebRTC | Audio, video y pantalla P2P |
| Tailwind CSS 4 | Estilos utilitarios y tema |
| Cloudinary | Subida y transformacion de avatares e imagenes de sala |
| Lucide React | Iconografia |

## Arquitectura de carpetas

```text
frontend/
├── public/                         # Assets publicos estaticos
├── src/
│   ├── assets/                     # Imagenes importadas desde TS/React
│   ├── config/                     # Firebase, API REST, realtime y Cloudinary
│   ├── layouts/                    # Layouts globales: landing, app, public
│   ├── modules/
│   │   ├── auth/                   # Login, registro, guardas, formularios auth
│   │   ├── dashboard/              # Dashboard de salas
│   │   ├── landing/                # Landing publica
│   │   ├── media/                  # Helpers de Cloudinary
│   │   ├── rooms/                  # Lobby, llamada, WebRTC, chat, participantes
│   │   └── users/                  # Perfil de usuario
│   ├── shared/
│   │   ├── api/                    # Cliente fetch comun y ApiError
│   │   ├── components/             # UI reusable
│   │   ├── hooks/                  # Hooks compartidos
│   │   ├── pages/                  # NotFound
│   │   └── theme/                  # Tema claro/oscuro y transiciones
│   ├── stores/                     # Zustand stores
│   ├── types/                      # Tipos compartidos
│   ├── router.tsx                  # Definicion de rutas
│   └── main.tsx                    # Bootstrap React
├── index.html
├── vite.config.ts
└── package.json
```

## Variables de entorno

Crear un archivo `.env` en `frontend/` cuando se ejecute localmente.

```env
# API REST NestJS
VITE_API_URL=http://localhost:3000/api

# Socket.IO realtime
VITE_REALTIME_URL=http://localhost:3001

# Firebase web app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET_AVATARS=...
VITE_CLOUDINARY_UPLOAD_PRESET_ROOMS=...

# TURN opcional para WebRTC
VITE_TURN_URL=turn:host:3478
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
```

Valores por defecto relevantes:

- `VITE_API_URL` cae a `http://localhost:3000/api`.
- `VITE_REALTIME_URL` cae a `http://localhost:3001`.
- Cloudinary tiene valores fallback para desarrollo, pero se recomienda usar `.env`.
- Si no hay `VITE_TURN_URL`, WebRTC usa solo STUN publico (`stun:stun.l.google.com:19302`).

## Scripts

```bash
npm install
npm run dev       # Vite dev server con --host
npm run build     # TypeScript build + Vite production build
npm run preview   # Sirve dist localmente
npm run lint      # ESLint
```

Nota: el lint global puede fallar si existen errores no relacionados en otros modulos. Para validar un archivo puntual se puede usar:

```bash
npx eslint src/modules/rooms/components/VideoTile.tsx
```

## Flujo de autenticacion

1. El usuario entra por `/login` o `/register`.
2. Firebase Auth autentica con correo/password o Google.
3. El frontend obtiene un Firebase ID Token.
4. Se llama a `POST /api/auth/register` para registrar o sincronizar el usuario en Firestore.
5. Las guardas consultan el perfil:
   - Perfil incompleto: redirige a `/complete-profile`.
   - Perfil completo: permite `/dashboard`, `/profile` y salas.

Archivos principales:

- `src/stores/useAuthStore.ts`
- `src/modules/auth/components/AuthRouteGuards.tsx`
- `src/modules/auth/api/authApi.ts`
- `src/modules/users/api/usersApi.ts`

## Flujo de salas

El dashboard permite:

- Crear sala (`POST /api/rooms`).
- Listar salas propias y salas donde el usuario participa (`GET /api/rooms/my-rooms`).
- Unirse por codigo (`POST /api/rooms/join`).
- Editar sala si el usuario es owner (`PATCH /api/rooms/:roomId`).
- Eliminar sala si el usuario es owner (`DELETE /api/rooms/:roomId`).
- Quitar sala del dashboard si el usuario es participante (`DELETE /api/rooms/:roomId/membership`).

Antes de entrar a la llamada se abre el lobby:

1. Se carga la sala y sus miembros.
2. Se solicita o previsualiza camara/microfono si el usuario lo permite.
3. Se guardan preferencias de lobby por sala en `sessionStorage`.
4. Al entrar, la sala usa esas preferencias iniciales.

Archivos principales:

- `src/modules/dashboard/pages/DashboardPage.tsx`
- `src/modules/rooms/hooks/useRoomLobby.ts`
- `src/modules/rooms/hooks/useRoomSession.ts`
- `src/modules/rooms/api/roomsApi.ts`

## Realtime, WebRTC y P2P

La llamada usa `Socket.IO` para eventos de sala y WebRTC para medios.

Eventos principales del cliente:

| Evento | Uso |
|---|---|
| `newUser` | Registra presencia global |
| `joinRoom` | Entra a la sala realtime |
| `leaveRoom` | Sale de la sala realtime |
| `roomUsers` | Lista de participantes conectados |
| `message:send` / `message:new` | Chat realtime |
| `media:status` | Estado de microfono, camara y pantalla |
| `reaction:send` / `reaction:new` | Reacciones visuales |
| `webrtc:offer` | Oferta SDP para un peer |
| `webrtc:answer` | Respuesta SDP |
| `webrtc:ice-candidate` | Candidatos ICE |
| `roomMemberRemoved` | Expulsion/salida forzada |
| `roomMemberMuted` | Silenciar participante por anfitrion |
| `deleteRoom` / `roomDeleted` | Eliminacion de sala |

Modelo P2P:

1. `roomUsers` informa que sockets estan en la sala.
2. El cliente crea un `RTCPeerConnection` por cada socket remoto.
3. Los peers intercambian `offer`, `answer` e `ice-candidate` via Socket.IO.
4. Si ICE encuentra ruta directa/STUN, los medios son P2P directos.
5. Si no hay ruta directa, el navegador puede usar TURN.

El frontend aisla fallas de peers:

- Un estado `disconnected` espera una ventana de recuperacion.
- Se intenta `ICE restart` una vez.
- Si un peer falla, se cierra solo esa conexion.
- Si un usuario nuevo no logra conectarse con nadie, se desconecta solo ese cliente de la sala.

## Media, pantalla y dispositivos

La sala soporta:

- Microfono on/off.
- Camara on/off con liberacion real del hardware al apagar.
- Cambio de camara frontal/trasera en moviles compatibles.
- Pantalla compartida con `navigator.mediaDevices.getDisplayMedia`.
- Audio de pantalla si el navegador lo entrega.
- Deteccion visual de quien habla por microfono y, de forma separada, audio de pantalla.
- Reproduccion de audio remota en una capa persistente para que al paginar tiles no se corte el audio.

Limitaciones de plataforma:

- En navegadores moviles donde `getDisplayMedia` no existe, no se puede capturar pantalla desde una web pura. El frontend muestra una advertencia clara.
- iOS/iPadOS suele requerir app nativa para captura de pantalla del sistema.

Archivos principales:

- `src/modules/rooms/components/VideoGrid.tsx`
- `src/modules/rooms/components/VideoTile.tsx`
- `src/modules/rooms/components/ControlBar.tsx`
- `src/modules/rooms/utils/roomMediaConstraints.ts`
- `src/modules/rooms/hooks/useRoomSession.ts`

## Estado local y comunicacion con APIs

Estado global:

- `useAuthStore`: usuario Firebase, perfil, login/logout, token.
- `useRoomsStore`: salas en dashboard y actualizaciones locales.
- `theme.store`: tema visual.

Comunicacion HTTP:

- `src/shared/api/apiClient.ts` centraliza `fetch`.
- Agrega `Authorization: Bearer <token>` cuando se pasa token.
- Lanza `ApiError` si la respuesta no es `ok`.

Comunicacion realtime:

- `src/config/socket.config.ts` mantiene una instancia singleton de Socket.IO.
- El token Firebase viaja en `auth.token` durante el handshake.
- La instancia se limpia al salir de la sala o al cambiar token.

## Rutas de la aplicacion

| Ruta | Tipo | Descripcion |
|---|---|---|
| `/` | Publica/guest | Landing |
| `/login` | Guest | Inicio de sesion |
| `/register` | Guest | Registro |
| `/complete-profile` | Auth incompleto | Completar perfil |
| `/dashboard` | Auth completo | Gestion de salas |
| `/profile` | Auth completo | Perfil de usuario |
| `/room/:id/lobby` | Auth completo | Lobby de dispositivos |
| `/room/:id` | Auth completo | Sala realtime |
| `*` | Publica | Not found |

## Integraciones externas

### Firebase

Se usa Firebase Auth en frontend para login/registro y Google Sign-In. El token se usa tanto contra REST como contra Socket.IO.

### Cloudinary

Se usa para subir:

- Avatares de usuario.
- Imagenes de portada de salas.

Los helpers de Cloudinary permiten resolver errores, transformar URLs y extraer `public_id`.

### TURN/STUN

TURN se configura por variables `VITE_TURN_*`. No se fuerza TURN para todos: el navegador decide por conexion si usa ruta directa/STUN o relay TURN.

## Verificacion y calidad

Comandos recomendados:

```bash
npm run build
npx eslint src/modules/rooms/hooks/useRoomSession.ts src/modules/rooms/components/VideoGrid.tsx
```

Para QA manual de WebRTC:

- Probar dos navegadores distintos.
- Probar dos redes distintas para forzar escenarios TURN.
- Validar que una falla de un peer no saque a todos.
- Validar pantalla compartida con camara simultanea.
- Validar paginacion de participantes con audio remoto continuo.

## Relacion con backend y backend-realtime

```text
frontend
  ├─ REST: /api/* ----------------------> backend (NestJS)
  │                                      usuarios, salas, historial
  │
  ├─ Socket.IO -------------------------> backend-realtime
  │                                      presencia, chat live, signaling
  │
  └─ WebRTC media ----------------------> otros navegadores
                                         audio, video, pantalla
```

Documentacion relacionada:

- REST: `backend/README.md` y Swagger en `/api/docs`.
- Sockets: `backend-realtime/README.md`.
- Eventos interactivos: `backend-realtime/docs/socket-events.html`.
