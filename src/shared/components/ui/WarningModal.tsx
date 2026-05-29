import React from "react";
import { AlertTriangle } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { Button } from "./Button";

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const WarningModal: React.FC<WarningModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const titleId = "warning-modal-title";
  const descriptionId = "warning-modal-description";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Advertencia"
    >
      <div
        className="flex flex-col items-center py-4 text-center"
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div
          className="
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-amber-500/10
            text-amber-500
            dark:bg-amber-500/20
            animate-pop-in
          "
          aria-hidden="true"
        >
          <AlertTriangle
            className="h-10 w-10"
            aria-hidden="true"
          />
        </div>

        <h3
          id={titleId}
          className="
            mb-2
            text-xl
            font-bold
            tracking-tight
            text-foreground
          "
        >
          Oops! Ha pasado algo inesperado:
        </h3>

        <p
          id={descriptionId}
          className="
            mb-6
            px-4
            text-sm
            leading-relaxed
            text-muted-foreground
          "
          aria-live="assertive"
        >
          {message}
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          aria-label="Cerrar advertencia"
          className="
            h-11
            w-full
            cursor-pointer
            rounded-xl
            transition-all
            duration-200
            hover:bg-amber-500
            hover:text-white
            hover:border-amber-500
          "
        >
          Entendido
        </Button>
      </div>
    </BaseModal>
  );
};