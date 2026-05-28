// components/auth/PasswordStrength.tsx
import React from "react";

interface PasswordStrengthProps {
  validation: {
    minLength: boolean;
    hasUppercase: boolean;
    hasNumber: boolean;
  };
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ validation }) => {
  const criteria = [
    { key: "minLength" as const, label: "Mínimo 8 caracteres" },
    { key: "hasUppercase" as const, label: "Incluye una mayúscula" },
    { key: "hasNumber" as const, label: "Incluye un número" },
  ];

  return (
    <div className="mt-2 space-y-1.5">
      {criteria.map(({ key, label }) => (
        <div
          key={key}
          className={`flex items-center gap-2 text-xs transition-colors duration-200 ${validation[key] ? "text-secondary" : "text-muted-foreground"
            }`}
        >
          <div
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all ${validation[key]
              ? "border-secondary bg-secondary/10 text-secondary"
              : "border-muted-foreground/30"
              }`}
          >
            {validation[key] && (
              <svg className="h-2 w-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
};