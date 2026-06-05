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
  role?: "dialog" | "alertdialog";
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  role = "dialog",
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  const modalRef =
    useRef<HTMLDivElement>(null);

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;

        const focusableSelector =
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(
          modalRef.current.querySelectorAll(focusableSelector)
        ) as HTMLElement[];

        const visibleFocusable = focusableElements.filter((el) => {
          const isVisible = el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
          const isDisabled = el.hasAttribute("disabled") || (el as any).disabled;
          return isVisible && !isDisabled;
        });

        if (visibleFocusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = visibleFocusable[0];
        const lastElement = visibleFocusable[visibleFocusable.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
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

    const focusTimeout = setTimeout(() => {
      if (!modalRef.current) return;

      const focusableSelector =
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(
        modalRef.current.querySelectorAll(focusableSelector)
      ) as HTMLElement[];

      const visibleFocusable = focusableElements.filter((el) => {
        const isVisible = el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
        const isDisabled = el.hasAttribute("disabled") || (el as any).disabled;
        return isVisible && !isDisabled;
      });

      if (visibleFocusable.length > 0) {
        visibleFocusable[0].focus();
      } else {
        modalRef.current.focus();
      }
    }, 50);

    return () => {
      clearTimeout(focusTimeout);
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
      role={role}
      aria-modal="true"
      aria-labelledby={
        ariaLabelledBy || (title ? "modal-title" : undefined)
      }
      aria-describedby={ariaDescribedBy || "modal-content"}
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