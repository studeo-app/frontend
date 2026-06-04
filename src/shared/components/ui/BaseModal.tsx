import React, {
  useEffect,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const modalRef =
    useRef<HTMLDivElement>(null);

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement as HTMLElement;

    const originalStyle =
      window.getComputedStyle(
        document.body
      ).overflow;

    document.body.style.overflow =
      "hidden";

    modalRef.current?.focus();

    return () => {
      document.body.style.overflow =
        originalStyle;

      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={
        title
          ? "modal-title"
          : undefined
      }
      aria-describedby="modal-content"
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        p-4
        bg-auth-bg/60
        backdrop-blur-sm
        animate-fade-in
      "
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="
          relative
          w-full
          max-w-md
          rounded-2xl
          border
          border-auth-input-border
          bg-auth-surface
          p-6
          text-auth-title
          shadow-2xl
          shadow-black/10
          animate-scale-up
        "
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {title ? (
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="modal-title"
              className="
                text-lg
                font-semibold
                tracking-tight
                text-auth-title
              "
            >
              {title}
            </h2>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="
                cursor-pointer
                rounded-lg
                p-1.5
                text-auth-label
                transition-colors
                hover:bg-auth-input-bg
                hover:text-auth-title
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary
              "
            >
              <X
                className="h-4 w-4"
                aria-hidden="true"
              />
            </button>
          </div>
        ) : null}

        <div
          id="modal-content"
          className={
            title
              ? "mt-2"
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};