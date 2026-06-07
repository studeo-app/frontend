import React, {
  useEffect,
  useCallback,
  useRef,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Defaults to "dialog". Use "alertdialog" for confirmations and alerts. */
  role?: "dialog" | "alertdialog";
  /** Override aria-labelledby. Defaults to "modal-title" when title prop is set. */
  labelledBy?: string;
  /** Sets aria-describedby when provided. */
  describedBy?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  role = "dialog",
  labelledBy,
  describedBy,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const instanceId = useId();
  const titleId = labelledBy ?? (title ? `modal-title-${instanceId}` : undefined);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
      )
    ).filter((el) => el.tabIndex !== -1);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || document.activeElement === modalRef.current) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    const focusTimeout = setTimeout(() => {
      if (modalRef.current) {
        const focusable = getFocusableElements(modalRef.current);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    return () => {
      clearTimeout(focusTimeout);
      document.body.style.overflow = originalStyle;
      const prevElement = previousFocusRef.current;
      setTimeout(() => {
        prevElement?.focus();
      }, 50);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        p-4
        animate-fade-in
      "
    >
      <div
        className="
          absolute
          inset-0
          bg-auth-bg/60
          backdrop-blur-sm
        "
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
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
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="mb-4 flex items-center justify-between">
            <h2
              id={titleId}
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

        <div className={title ? "mt-2" : undefined}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
