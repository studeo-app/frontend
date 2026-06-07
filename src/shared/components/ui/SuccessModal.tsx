import React from "react";
import { CheckCircle2 } from "lucide-react";
import { BaseModal } from "./BaseModal";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  message,
  title = "¡Vamos bien!",
}) => {
  const titleId = "success-modal-title";
  const descriptionId = "success-modal-description";

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
            bg-auth-link/10
            text-auth-link
            animate-pop-in
          "
          aria-hidden="true"
        >
          <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
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
            border-none
            bg-auth-btn
            text-sm
            font-semibold
            text-auth-btn-text
            transition-all
            duration-200
            hover:brightness-110
            active:scale-[0.98]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-auth-btn
            focus-visible:ring-offset-2
            focus-visible:ring-offset-auth-surface
          "
        >
          Continuar
        </button>
      </div>
    </BaseModal>
  );
};
