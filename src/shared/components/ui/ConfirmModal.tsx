import React from "react";
import { AlertTriangle } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  critical?: boolean;
  warning?: boolean;
  confirmDisabled?: boolean;
  confirmAriaLabel?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  critical = false,
  warning = false,
  confirmDisabled = false,
  confirmAriaLabel,
}) => {
  const descriptionId = "confirm-modal-description";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      role="alertdialog"
      describedBy={descriptionId}
    >
      <div className="flex flex-col items-center py-2 text-center">
        {(critical || warning) && (
          <div
            className={`
              mb-4
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-full
              animate-pop-in
              ${critical ? "bg-auth-error/10 text-auth-error" : "bg-amber-500/10 text-amber-500"}
            `}
            aria-hidden="true"
          >
            <AlertTriangle className="h-10 w-10" aria-hidden="true" />
          </div>
        )}

        <div
          id={descriptionId}
          className="mb-6 px-2 text-sm leading-relaxed text-auth-label text-left w-full"
        >
          {message}
        </div>

        <div className="flex w-full gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={confirmDisabled || isLoading}
            aria-label={confirmAriaLabel ?? confirmText}
            className={`w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-auth-btn focus-visible:ring-offset-2 focus-visible:outline-none ${
              critical
                ? "bg-auth-error text-white hover:brightness-110 shadow-auth-error/20 disabled:opacity-40 disabled:hover:brightness-100 disabled:cursor-not-allowed"
                : ""
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};
