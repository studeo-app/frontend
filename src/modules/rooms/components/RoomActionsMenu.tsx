import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorModal } from '@/shared/components/ui/ErrorModal'
import { SuccessModal } from '@/shared/components/ui/SuccessModal'
import { DeleteRoomConfirmModal } from './DeleteRoomConfirmModal'
import { EditRoomModal } from './EditRoomModal'
import { useDeleteRoom } from '../hooks/useDeleteRoom'
import type { Room } from '@/types/room'

interface RoomActionsMenuProps {
  room: Room
  isOwner: boolean
  variant?: 'card' | 'header'
  onUpdated?: (room: Room) => void
  onDeleted?: (roomId: string) => void
}

export function RoomActionsMenu({
  room,
  isOwner,
  variant = 'card',
  onUpdated,
  onDeleted,
}: RoomActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
    startDeleteRoom,
    isDeleting,
    errorMsg: deleteErrorMsg,
    setErrorMsg: setDeleteErrorMsg,
    deleteSuccess,
    setDeleteSuccess,
  } = useDeleteRoom()

  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  if (!isOwner) return null

  const handleEdit = () => {
    setMenuOpen(false)
    setEditOpen(true)
  }

  const handleDeleteClick = () => {
    setMenuOpen(false)
    setDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    try {
      await startDeleteRoom(room.id)
      setDeleteOpen(false)
    } catch {
      setDeleteOpen(false)
    }
  }

  const handleDeleteSuccessClose = () => {
    onDeleted?.(room.id)
    setDeleteSuccess(false)
  }

  const buttonClass =
    variant === 'card'
      ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-auth-bg/80 text-auth-title backdrop-blur-sm border border-auth-input-border/50 transition hover:bg-auth-surface cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn'
      : 'flex h-9 w-9 items-center justify-center rounded-xl border border-auth-input-border bg-auth-input-bg/50 text-auth-label transition hover:border-auth-btn/40 hover:text-auth-title cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn'

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label={`Opciones de la sala ${room.name}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((open) => !open)
          }}
          className={buttonClass}
        >
          <MoreVertical className="h-4 w-4" aria-hidden="true" />
        </button>

        {menuOpen && (
          <ul
            role="menu"
            className="
              absolute right-0 z-30 mt-1 min-w-[140px] overflow-hidden rounded-xl
              border border-auth-input-border bg-auth-surface py-1 shadow-lg
            "
          >
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                className="
                  flex w-full items-center gap-2 px-3 py-2 text-sm text-auth-title
                  transition hover:bg-auth-input-bg cursor-pointer
                "
              >
                <Pencil className="h-4 w-4 text-auth-label" aria-hidden="true" />
                Editar
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteClick()
                }}
                className="
                  flex w-full items-center gap-2 px-3 py-2 text-sm cursor-pointer
                  text-red-400 hover:bg-red-500/10 hover:text-red-300
                  transition-colors duration-200
                "
              >
                <Trash2 className="h-4 w-4 text-current" aria-hidden="true" />
                Eliminar
              </button>
            </li>
          </ul>
        )}
      </div>

      <EditRoomModal
        isOpen={editOpen}
        room={room}
        onClose={() => setEditOpen(false)}
        onSuccess={(updated) => onUpdated?.(updated)}
      />

      <DeleteRoomConfirmModal
        isOpen={deleteOpen}
        roomName={room.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !isDeleting && setDeleteOpen(false)}
      />

      <SuccessModal
        isOpen={deleteSuccess}
        onClose={handleDeleteSuccessClose}
        title="Sala eliminada"
        message="La sala se ha eliminado correctamente."
      />

      <ErrorModal
        isOpen={!!deleteErrorMsg}
        onClose={() => setDeleteErrorMsg(null)}
        title="Error al eliminar sala"
        message={deleteErrorMsg ?? ''}
      />
    </>
  )
}
