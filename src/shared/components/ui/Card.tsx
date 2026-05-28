import React from "react";


export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-2xl
          border
          border-border/60
          bg-card
          text-card-foreground
          shadow-[0_8px_30px_rgb(0,0,0,0.12)]
          transition-colors
          ${className || ""}
        `}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";


export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      {...props}
    />
  );
});

CardContent.displayName = "CardContent";
