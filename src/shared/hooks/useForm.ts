// hooks/useForm.ts
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

    if (rules.minLength && value.length < rules.minLength) {
      if (name === "password") {
        return `Debe tener al menos ${rules.minLength} caracteres`;
      }
      return `Mínimo ${rules.minLength} caracteres`;
    }

    if (rules.custom) {
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
    return isValid;
  }, [fields, validateField]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields((prev) => ({
      ...prev,
      [name]: { ...prev[name], value, error: "" },
    }));
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

  const getFieldError = useCallback((name: string, showErrors: boolean) => {
    return showErrors ? fields[name]?.error : undefined;
  }, [fields]);

  return {
    fields,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    getFieldError,
    setFieldValue: (name: string, value: string) => {
      setFields((prev) => ({ ...prev, [name]: { ...prev[name], value, error: "" } }));
    },
  };
}