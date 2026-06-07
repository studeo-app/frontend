import React from "react";
import { XCircle } from "lucide-react";
import { BaseModal } from "./BaseModal";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  message,
  title = "Oops! Ha ocurrido un error:",
}) => {
  const titleId = "error-modal-title";
  const descriptionId = "error-modal-description";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      role="alertdialog"
      labelledBy={titleId}
      describedBy={descriptionId}
    >
      <div className="flex flex-col items-center py-4 text-center">
        <div
          className="
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-auth-error/10
            text-auth-error
            animate-pop-in
          "
          aria-hidden="true"
        >
          <XCircle
            className="h-10 w-10"
            aria-hidden="true"
          />
        </div>

        <h3
          id={titleId}
          className="mb-2 text-xl font-bold tracking-tight text-auth-title"
        >
          {title}
        </h3>

        <p
          id={descriptionId}
          className="mb-6 px-4 text-sm leading-relaxed text-auth-label"
        >
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="
            h-11
            w-full
            cursor-pointer
            rounded-xl
            border
            border-auth-error
            bg-auth-error
            text-sm
            font-semibold
            text-white
            transition-all
            duration-200
            hover:brightness-110
            active:scale-[0.98]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-auth-error
            focus-visible:ring-offset-2
            focus-visible:ring-offset-auth-surface
          "
        >
          Aceptar
        </button>
      </div>
    </BaseModal>
  );
};
