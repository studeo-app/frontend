import { BaseModal } from '@/shared/components/ui/BaseModal'

interface DeleteRoomConfirmModalProps {
  isOpen: boolean
  roomName: string
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteRoomConfirmModal({
  isOpen,
  roomName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteRoomConfirmModalProps) {
  const titleId = 'delete-room-confirm-title'
  const descriptionId = 'delete-room-confirm-desc'

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className="flex flex-col text-center">
        <h3
          id={titleId}
          className="text-xl font-bold tracking-tight text-auth-title"
        >
          ¿Eliminar sala?
        </h3>
        <p
          id={descriptionId}
          className="mt-3 text-sm leading-relaxed text-auth-label"
        >
          Vas a eliminar permanentemente{' '}
          <span className="font-semibold text-auth-title">{roomName}</span>.
          Esta acción no se puede deshacer.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="
              flex-1 h-11 rounded-xl border border-auth-input-border text-auth-title
              text-sm font-medium transition hover:bg-auth-input-bg active:scale-[0.98]
              disabled:opacity-50 cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-btn
            "
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="
              flex-1 h-11 rounded-xl bg-auth-error text-sm font-semibold text-white
              transition hover:brightness-110 active:scale-[0.98]
              disabled:opacity-50 cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-auth-error
            "
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
