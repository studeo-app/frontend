import React from "react";

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, error, id, ...props }, ref) => {
  const errorId = error && id ? `${id}-error` : undefined;

  return (
    <div className="w-full">
      <input
        ref={ref}
        id={id}
        className={`
          flex
          h-2
          w-full
          rounded-xl
          border
          border-input/60
          bg-background/60
          px-4
          py-2
          text-sm
          text-foreground
          shadow-sm
          transition-all
          duration-200
          placeholder:text-muted-foreground
          hover:border-border
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring/70
          focus-visible:ring-offset-2
          focus-visible:ring-offset-background
          focus-visible:border-primary/60
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${
            error
              ? "border-destructive focus-visible:ring-destructive"
              : ""
          }
          ${className || ""}
        `}
        aria-invalid={!!error}
        aria-describedby={errorId}
        {...props}
      />

      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="
            mt-2
            px-1
            text-xs
            text-destructive
            animate-in
            fade-in-0
            slide-in-from-top-1
          "
        >
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";