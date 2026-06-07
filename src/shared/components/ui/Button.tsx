import React from "react";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: `
        bg-primary
        text-primary-foreground
        hover:brightness-110
        shadow-lg
        shadow-primary/20
      `,

      secondary: `
        bg-secondary
        text-secondary-foreground
        hover:brightness-110
      `,

      outline: `
        border
        border-border/60
        bg-background/60
        hover:bg-accent
        hover:text-accent-foreground
      `,

      ghost: `
        hover:bg-accent
        hover:text-accent-foreground
      `,
    };

    const sizes = {
      sm: "h-9 px-3 text-xs rounded-lg",
      md: "h-11 px-4 text-sm rounded-xl",
      lg: "h-12 px-6 text-sm rounded-xl",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex
          items-center
          justify-center
          gap-2
          whitespace-nowrap
          font-medium
          transition-all
          duration-200
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
          focus-visible:ring-offset-2
          ring-offset-background
          disabled:pointer-events-none
          disabled:opacity-50
          active:scale-[0.98]
          ${variants[variant]}
          ${sizes[size]}
          ${className || ""}
        `}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            role="status"
            aria-label="Cargando"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />

            <path
              className="opacity-80"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"
            />
          </svg>
        )}

        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
