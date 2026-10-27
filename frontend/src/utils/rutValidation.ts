/**
 * @file rutValidation.ts
 * @description Utilidades de sanitización, formateo y validación de RUT chileno
 * bajo el estándar estricto de la plataforma MARCOM: SIN puntos y CON guion (ej: 12345678-9).
 */

export interface RutValidationResult {
  isValid: boolean;
  formatted: string;
  errorMessage?: string;
}

/**
 * Expresión regular oficial para RUT chileno sin puntos y con guion:
 * 7 u 8 dígitos numéricos + guion (-) + dígito verificador (0-9 o K).
 */
export const RUT_SIN_PUNTOS_CON_GUION_REGEX = /^\d{7,8}-[\dK]$/;

/**
 * Sanitiza en tiempo real lo que el usuario escribe o pega en un input de RUT:
 * - Elimina inmediatamente cualquier punto (.) o espacio.
 * - Convierte 'k' minúscula en 'K' mayúscula.
 * - Si el usuario pega un RUT con puntos (ej: "12.345.678-9") o escribe 9 caracteres seguidos,
 *   asegura el formato sin puntos y con guion antes del dígito verificador.
 */
export function sanitizeRutInput(raw: string): string {
  if (!raw) return "";

  // Eliminar puntos, espacios y cualquier carácter no permitido
  const noDots = raw.replace(/\./g, "").replace(/\s+/g, "").toUpperCase();

  // Si ya contiene guion, limpiar ambos lados (cuerpo numérico y dígito verificador)
  if (noDots.includes("-")) {
    const parts = noDots.split("-");
    const body = parts[0].replace(/\D/g, "").slice(0, 8);
    const dv = parts
      .slice(1)
      .join("")
      .replace(/[^0-9K]/g, "")
      .slice(0, 1);
    return `${body}-${dv}`;
  }

  // Si no tiene guion todavía, permitir solo números (y K al final)
  const clean = noDots.replace(/[^0-9K]/g, "");
  if (clean.length <= 1) {
    return clean;
  }

  // Si el usuario escribió o pegó 9 caracteres (8 dígitos + verificador) o terminó en K, insertar guion automáticamente
  const bodyCandidate = clean.slice(0, -1).replace(/\D/g, "").slice(0, 8);
  const lastChar = clean.slice(-1);

  if (clean.length >= 9 || lastChar === "K") {
    return `${bodyCandidate}-${lastChar}`;
  }

  return clean.replace(/K/g, "");
}

/**
 * Formatea un RUT al perder el foco (onBlur) o antes de enviar:
 * Si el usuario ingresó "123456789" o "12.345.678-9", lo convierte a "12345678-9".
 */
export function formatRutSinPuntosConGuion(raw: string): string {
  if (!raw) return "";
  const clean = raw.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;

  const body = clean.slice(0, -1).replace(/\D/g, "").slice(0, 8);
  const dv = clean.slice(-1);
  if (!body) return clean;
  return `${body}-${dv}`;
}

/**
 * Valida que el RUT cumpla estrictamente el formato sin puntos y con guion (ej: 12345678-9 o 76543210-K).
 */
export function validateRutSinPuntosConGuion(raw: string, fieldLabel = "RUT"): RutValidationResult {
  const trimmed = (raw || "").trim().toUpperCase();

  if (!trimmed) {
    return {
      isValid: false,
      formatted: "",
      errorMessage: `El campo ${fieldLabel} es obligatorio.`
    };
  }

  if (trimmed.includes(".")) {
    return {
      isValid: false,
      formatted: formatRutSinPuntosConGuion(trimmed),
      errorMessage: `El ${fieldLabel} debe ingresarse sin puntos y con guion (ejemplo: 12345678-9).`
    };
  }

  if (!trimmed.includes("-")) {
    return {
      isValid: false,
      formatted: formatRutSinPuntosConGuion(trimmed),
      errorMessage: `El ${fieldLabel} debe incluir guion antes del dígito verificador (ejemplo: 12345678-9).`
    };
  }

  if (!RUT_SIN_PUNTOS_CON_GUION_REGEX.test(trimmed)) {
    return {
      isValid: false,
      formatted: trimmed,
      errorMessage: `Formato de ${fieldLabel} inválido. Ingresa 7 u 8 dígitos sin puntos, seguidos de guion y dígito verificador (ejemplo: 12345678-9).`
    };
  }

  return {
    isValid: true,
    formatted: trimmed
  };
}
