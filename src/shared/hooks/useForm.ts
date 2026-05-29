import { useState, useCallback } from "react";
import type { ChangeEvent } from "react";

interface ValidationRule {
  required?: boolean;
  email?: boolean;
  minLength?: number;
  custom?: (value: string, formValues?: Record<string, string>) => string | undefined;
}

interface FieldConfig {
  value: string;
  rules?: ValidationRule;
  error?: string;
}

export function useForm(initialFields: Record<string, FieldConfig>) {
  const [fields, setFields] = useState(initialFields);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((
    name: string, 
    value: string, 
    allValues?: Record<string, string>
  ): string => {
    const field = fields[name];
    const rules = field?.rules;

    if (!rules) return "";

    if (rules.required && !value.trim()) {
      return "Este campo es obligatorio";
    }

    if (rules.email && value.trim()) {
      const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return "Ingresa un correo electrónico válido";
      }
    }

    if (
      rules.minLength &&
      value.trim() &&
      value.length < rules.minLength
    ) {
      if (name === "password") {
        return `Debe tener al menos ${rules.minLength} caracteres`;
      }
      return `Mínimo ${rules.minLength} caracteres`;
    }

    if (rules.custom && value.trim()) {
      const customError = rules.custom(value, allValues);
      if (customError) return customError;
    }

    return "";
  }, [fields]);

  const validateAll = useCallback(() => {
    const currentValues = Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, field.value])
    );
    
    let isValid = true;
    const newFields = { ...fields };

    Object.keys(newFields).forEach((name) => {
      const error = validateField(name, newFields[name].value, currentValues);
      newFields[name] = { ...newFields[name], error };
      if (error) isValid = false;
    });

    setFields(newFields);
    setTouched((prev) => {
      const next = { ...prev };
      Object.keys(newFields).forEach((name) => {
        next[name] = true;
      });
      return next;
    });
    return isValid;
  }, [fields, validateField]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => {
      if (!prev[name]) return prev;
      return {
        ...prev,
        [name]: { ...prev[name], value, error: "" },
      };
    });
  }, []);

  const handleBlur = useCallback((name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const currentValues = Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [key, field.value])
    );
    const error = validateField(name, fields[name].value, currentValues);
    setFields((prev) => ({
      ...prev,
      [name]: { ...prev[name], error },
    }));
  }, [fields, validateField]);

  const getFieldError = useCallback(
    (name: string, showAllErrors: boolean) => {
      if (!showAllErrors && !touched[name]) {
        return undefined;
      }

      const storedError = fields[name]?.error;
      return storedError || undefined;
    },
    [fields, touched]
  );

  const shouldShowFieldError = useCallback(
    (name: string, showAllErrors: boolean) => {
      return showAllErrors || !!touched[name];
    },
    [touched]
  );

  return {
    fields,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
    shouldShowFieldError,
    setFieldValue: (name: string, value: string) => {
      setFields((prev) => ({ ...prev, [name]: { ...prev[name], value, error: "" } }));
    },
  };
}