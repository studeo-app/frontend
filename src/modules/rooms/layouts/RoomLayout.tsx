import { Outlet } from 'react-router'

/** Layout inmersivo a pantalla completa para salas (sin sidebar del dashboard). */
export default function RoomLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-auth-bg font-sans text-auth-title transition-colors duration-500">
      <Outlet />
    </div>
  )
}
