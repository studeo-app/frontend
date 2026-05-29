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
            bg-amber-500/10
            text-amber-500
            dark:bg-amber-500/20
            animate-pop-in
          "
        >
          <AlertTriangle className="h-10 w-10" />
        </div>

        {/* Mensaje estructurado */}
        <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
          Oops! Ha pasado algo inesperado:
        </h3>
        
        <p className="text-sm text-muted-foreground leading-relaxed px-4 mb-6">
          {message}
        </p>

        {/* Botón de acción */}
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full h-11 rounded-xl cursor-pointer hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all duration-200"
        >
          Entendido
        </Button>
      </div>
    </BaseModal>
  );
};
