import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export interface PasswordValidationResult {
  isValid: boolean;
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  errorMessage: string | null;
}

const WEAK_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "password",
  "password123",
  "password123!",
  "qwerty",
  "qwerty123",
  "admin123",
  "admin123!",
  "marcom",
  "marcom123",
  "marcom2026",
  "abc12345",
  "11111111",
  "00000000",
  "iloveyou",
  "letmein",
  "welcome",
]);

export function validateStrongPassword(password: string): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);
  const isCommonWeak = WEAK_PASSWORDS.has(password.trim().toLowerCase());

  let errorMessage: string | null = null;
  if (!minLength) {
    errorMessage = "La contraseña debe tener al menos 8 caracteres.";
  } else if (isCommonWeak) {
    errorMessage = "La contraseña elegida es demasiado común o insegura.";
  } else if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
    const missing: string[] = [];
    if (!hasUpper) missing.push("una letra mayúscula (A-Z)");
    if (!hasLower) missing.push("una letra minúscula (a-z)");
    if (!hasNumber) missing.push("un número (0-9)");
    if (!hasSpecial) missing.push("un carácter especial (!@#$%^&*._-)");
    errorMessage = `Contraseña insegura: debe ser alfanumérica con caracteres especiales. Falta incluir al menos ${missing.join(", ")}.`;
  }

  return {
    isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial && !isCommonWeak,
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    errorMessage,
  };
}

export const PasswordRequirementsChecklist: React.FC<{ password: string }> = ({ password }) => {
  const check = validateStrongPassword(password);

  const items = [
    { label: "Mínimo 8 caracteres", met: check.minLength },
    { label: "Al menos una letra mayúscula (A-Z)", met: check.hasUpper },
    { label: "Al menos una letra minúscula (a-z)", met: check.hasLower },
    { label: "Al menos un número (0-9)", met: check.hasNumber },
    { label: "Al menos un carácter especial (!@#$%^&*._-)", met: check.hasSpecial },
  ];

  return (
    <div
      style={{
        marginTop: "10px",
        padding: "10px 12px",
        borderRadius: "8px",
        background: "rgba(15, 23, 42, 0.45)",
        border: "1px solid rgba(56, 189, 248, 0.2)",
        fontSize: "0.78rem",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          color: "hsl(var(--text-primary))",
          marginBottom: "6px",
          fontSize: "0.79rem",
        }}
      >
        Requisitos de contraseña segura (alfanumérica + especial):
      </div>
      <div style={{ display: "grid", gap: "4px" }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: item.met ? "#34d399" : "hsl(var(--text-muted))",
              transition: "color 0.2s ease",
            }}
          >
            {item.met ? (
              <CheckCircle2 size={13} style={{ flexShrink: 0, color: "#34d399" }} />
            ) : (
              <Circle size={13} style={{ flexShrink: 0, opacity: 0.55 }} />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
