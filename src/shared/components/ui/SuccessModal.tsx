import React from "react";
import { CheckCircle2 } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { Button } from "./Button";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const titleId = "success-modal-title";
  const descriptionId = "success-modal-description";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Operación exitosa"
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
            bg-secondary/10
            text-secondary
            animate-pop-in
          "
          aria-hidden="true"
        >
          <CheckCircle2
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
          ¡Vamos bien!
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
          aria-live="polite"
        >
          {message}
        </p>

        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          className="
            h-11
            w-full
            cursor-pointer
            rounded-xl
            transition-all
            duration-200
          "
          aria-label="Continuar"
        >
          Continuar
        </Button>
      </div>
    </BaseModal>
  );
};