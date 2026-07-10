# Studeo Frontend

SPA de Studeo construida con React, Vite y TypeScript. Implementa autenticacion, perfil, dashboard de salas, lobby multimedia y sala realtime con chat, audio, video, pantalla compartida, reacciones y controles de moderacion.

## Rol dentro del sistema

| Capa | Rol | Puerto local |
|---|---|---|
| `frontend` | Interfaz web | `5173` |
| `backend` | API REST NestJS | `3000` |
| `backend-realtime` | Socket.IO, presencia, chat live y WebRTC signaling | `3001` |

Los medios WebRTC no pasan por los backends. Socket.IO se usa para presencia, chat, reacciones, moderacion y senalizacion.

## Stack

| Tecnologia | Version en `package.json` | Uso |
|---|---|---|
| React | `^19.2.6` | UI |
| Vite | `^8.0.12` | Dev server y build |
| TypeScript | `~6.0.2` | Tipado |
| React Router | `^7.15.1` | Routing |
| Zustand | `^5.0.13` | Estado global |
| Firebase | `^12.13.0` | Auth y configuracion cliente |
| Socket.IO Client | `^4.8.3` | Realtime |
| Tailwind CSS | `^4.3.0` | Estilos |
| Cloudinary | `@cloudinary/react` / `@cloudinary/url-gen` | Imagenes |
| Lucide React | `^1.16.0` | Iconos |

## Estructura

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── config/              # API, Firebase, Firestore, Socket.IO, Cloudinary
│   ├── layouts/
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── landing/
│   │   ├── media/
│   │   ├── rooms/
│   │   └── users/
│   ├── shared/
│   ├── stores/
│   ├── types/
│   ├── main.tsx
│   ├── routeElements.tsx
│   └── router.tsx
├── index.html
├── vite.config.ts
└── package.json
```

## Variables de entorno

Crear `frontend/.env` para desarrollo local:

```env
VITE_API_URL=http://localhost:3000/api
VITE_REALTIME_URL=http://localhost:3001

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...

VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET_AVATARS=...
VITE_CLOUDINARY_UPLOAD_PRESET_ROOMS=...

VITE_TURN_URL=turn:host:3478
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
```

Defaults relevantes:

- `VITE_API_URL` cae a `http://localhost:3000/api`.
- `VITE_REALTIME_URL` cae a `http://localhost:3001`.
- Si no hay `VITE_TURN_URL`, WebRTC usa STUN publico (`stun:stun.l.google.com:19302`).

## Ejecutar en local

```bash
npm install
npm run dev
```

El dev server usa `vite --host`. Normalmente queda disponible en `http://localhost:5173`.

## Scripts

```bash
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run preview   # Sirve dist localmente
npm run lint      # ESLint
```

## Rutas de la aplicacion

| Ruta | Tipo | Descripcion |
|---|---|---|
| `/` | Guest | Landing |
| `/login` | Guest | Inicio de sesion |
| `/register` | Guest | Registro |
| `/complete-profile` | Auth con perfil incompleto | Completar perfil |
| `/completar-perfil` | Redirect | Redirige a `/complete-profile` |
| `/dashboard` | Auth con perfil completo | Gestion de salas |
| `/profile` | Auth con perfil completo | Perfil |
| `/room/:id/lobby` | Auth con perfil completo | Lobby de dispositivos |
| `/room/:id` | Auth con perfil completo | Sala realtime |
| `*` | Publica | Not found |

## Flujo de autenticacion

1. El usuario inicia sesion o se registra con Firebase Auth.
2. El frontend obtiene un Firebase ID Token.
3. Llama a `POST /api/auth/register` para registrar o sincronizar el perfil.
4. Las guardas de ruta consultan `GET /api/users/profile`.
5. Si el perfil esta incompleto, el usuario va a `/complete-profile`; si esta completo, puede entrar a dashboard y salas.

Archivos principales:

- `src/stores/useAuthStore.ts`
- `src/modules/auth/components/AuthRouteGuards.tsx`
- `src/modules/auth/api/authApi.ts`
- `src/modules/users/api/usersApi.ts`

## Comunicacion REST

El cliente comun vive en `src/shared/api/apiClient.ts` y agrega `Authorization: Bearer <token>` cuando se le pasa token.

Endpoints REST usados por el frontend y presentes en el backend actual:

| Funcion frontend | Endpoint |
|---|---|
| `checkBackendHealth` | `GET /api/health` |
| Auth/profile | `POST /api/auth/register`, `GET /api/users/profile`, `POST /api/users/complete-profile`, `PATCH /api/users/profile`, `DELETE /api/users/profile` |
| Disponibilidad | `GET /api/users/check-username/:username`, `GET /api/users/check-email/:email` |
| Salas basicas | `POST /api/rooms`, `GET /api/rooms/my-rooms`, `GET /api/rooms/:roomId`, `PATCH /api/rooms/:roomId`, `DELETE /api/rooms/:roomId` |

Endpoints que el frontend intenta consumir pero el backend actual no expone:

- `POST /api/rooms/join`
- `GET /api/rooms/:roomId/members`
- `GET /api/rooms/my-rooms/members`
- `DELETE /api/rooms/:roomId/membership`
- `GET /api/rooms/:roomId/messages`

Esas rutas deben implementarse en `backend` o retirarse/adaptarse del frontend para evitar errores `404`.

## Realtime y WebRTC

La conexion Socket.IO se configura en `src/config/socket.config.ts` y envia el Firebase ID Token en `auth.token`.

Eventos principales:

| Evento | Uso |
|---|---|
| `newUser` | Presencia global |
| `joinRoom` / `leaveRoom` | Entrada y salida realtime |
| `roomUsers` | Participantes conectados |
| `message:send` / `message:new` | Chat live |
| `media:status` | Estado de microfono, camara y pantalla |
| `reaction:send` / `reaction:new` | Reacciones |
| `roomMemberRemoved` | Salida forzada o expulsion |
| `roomMemberMuted` | Solicitud de mute remoto por anfitrion |
| `deleteRoom` / `roomDeleted` | Eliminacion realtime de sala |
| `webrtc:offer` / `webrtc:answer` / `webrtc:ice-candidate` | Senalizacion P2P |

Modelo P2P:

1. `roomUsers` informa los sockets presentes.
2. El cliente crea un `RTCPeerConnection` por peer remoto.
3. Los peers intercambian SDP e ICE por Socket.IO.
4. Los tracks de audio, video y pantalla viajan navegador a navegador o por TURN.

## Media y dispositivos

La sala soporta:

- Microfono on/off.
- Camara on/off con liberacion del hardware al apagar.
- Cambio de camara en moviles compatibles.
- Pantalla compartida con `getDisplayMedia`.
- Audio de pantalla si el navegador lo entrega.
- Deteccion visual de audio activo.
- Capa persistente de audio remoto para no cortar audio al paginar participantes.

Limitaciones conocidas:

- En navegadores moviles sin `getDisplayMedia`, una web no puede capturar pantalla.
- iOS/iPadOS suele requerir app nativa para captura de pantalla del sistema.

## Subtítulos en la sala

Los subtítulos son un flujo local y en tiempo real para la llamada. El usuario que los activa es quien genera el texto; todos los participantes de la sala pueden ver los subtítulos sobre la tarjeta del usuario que está hablando.

### Requisitos y condiciones

- Debe haber un micrófono activo y permisos concedidos para audio.
- El navegador debe soportar `AudioContext` y `Worker` (la transcripción local se ejecuta en un worker del frontend).
- En móviles, la compatibilidad puede variar según el navegador y el sistema operativo; si falla la activación, la sala no debe cerrarse ni interrumpirse.

### Cómo activarlos

1. Entrar a una sala y abrir los ajustes de la sala.
2. Buscar la opción “Subtítulos”.
3. Activarla desde el interruptor.
4. Si el navegador pide permisos de micrófono, aceptarlos.
5. Si la activación falla, aparecerá un toast indicando que no se pudieron activar los subtítulos, pero la llamada seguirá activa.

### Comportamiento real

- El texto se genera en el cliente que activó los subtítulos.
- El frontend envía un evento de `caption:update` por Socket.IO al backend en tiempo real.
- El backend lo reenvía a la sala para que todos lo vean.
- Los subtítulos se muestran en la interfaz sobre el tile del participante correspondiente.
- Al desactivar los subtítulos o al producirse un error de inicio, se limpia el estado local y se emite el clear correspondiente.

### QA recomendado

- Probar en desktop y móvil con micrófono habilitado.
- Confirmar que un participante sin subtítulos activados puede ver los subtítulos del que sí los activó.
- Confirmar que, si el navegador bloquea el micrófono o falla el worker, aparece el toast de error y la llamada sigue operativa.

### Troubleshooting

- Si no aparecen subtítulos, verificar que el micrófono esté activo y que el navegador haya concedido permisos de audio.
- Si el botón no responde, probar recargando la sala y volviendo a entrar.
- Si el navegador es muy restrictivo en móvil, puede fallar la activación inicial; en ese caso el sistema muestra un toast de error sin interrumpir la llamada.
- Si los subtítulos se ven incorrectos, hablar con un ritmo más claro y evitar ruido ambiental fuerte.

## Integraciones

| Integracion | Uso |
|---|---|
| Firebase Auth | Login, registro y token para REST/Socket.IO |
| Cloudinary | Avatares e imagenes de sala |
| TURN/STUN | Conectividad WebRTC |

## Verificacion

Comandos recomendados:

```bash
npm run build
npm run lint
```

QA manual sugerido para WebRTC:

- Probar dos navegadores distintos.
- Probar redes distintas para cubrir casos TURN.
- Validar entrada/salida de usuarios.
- Validar pantalla compartida junto con camara.
- Validar que un peer fallido no saque a toda la sala.

## Documentacion relacionada

- REST: `../backend/README.md` y Swagger en `http://localhost:3000/api/docs`.
- Realtime: `../backend-realtime/README.md`.
- Eventos visuales: `../backend-realtime/docs/socket-events.html` o `http://localhost:3001/docs`.
