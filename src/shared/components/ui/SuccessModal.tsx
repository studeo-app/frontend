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
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col items-center text-center py-4">
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
        >
          <CheckCircle2 className="h-10 w-10" />
        </div>

        {/* Mensaje estructurado */}
        <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Vamos bien!
        </h3>

        <p className="text-sm text-muted-foreground leading-relaxed px-4 mb-6">
          {message}
        </p>

        {/* Botón de acción */}
        <Button
          variant="secondary"
          onClick={onClose}
          className="w-full h-11 rounded-xl cursor-pointer transition-all duration-200"
        >
          Continuar
        </Button>
      </div>
    </BaseModal>
  );
};
