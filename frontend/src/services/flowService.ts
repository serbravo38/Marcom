/**
 * @file flowService.ts
 * @description Integración oficial con la pasarela de pagos Flow (Chile) Sandbox.
 * Permite generar la sesión de pago oficial y redirigir directamente al portal de Flow.
 */

import { api } from "./api";

export const FLOW_CONFIG = {
  currency: "CLP"
};

export interface CustomerData {
  nombre: string;
  rut: string;
  email: string;
  telefono: string;
  direccion: string;
  comuna: string;
  region: string;
  tipoDocumento: "BOLETA" | "FACTURA";
  razonSocial?: string;
  rutEmpresa?: string;
  giroEmpresa?: string;
}

export interface PaymentItem {
  model: string;
  inchesLabel: string;
  supportName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface FlowPaymentOrder {
  orderId: string;
  token: string;
  amount: number;
  items: PaymentItem[];
  customer: CustomerData;
  createdAt: string;
  paymentMethod: "FLOW";
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  authorizationCode?: string;
  dteFolio?: number;
}

export interface FlowOrderRequest {
  commerceOrder: string;
  amount: number;
  subject: string;
  email: string;
  secretKey?: string;
  items: PaymentItem[];
  customer: CustomerData;
}

export interface FlowOrderResponse {
  success: boolean;
  redirectUrl?: string;
  url?: string;
  token?: string;
  requiresSecretKey?: boolean;
  error?: string;
  code?: number;
  message?: string;
  detail?: string;
}

/**
 * Genera un código de orden único para el comercio Marcom.
 */
export const generateCommerceOrder = (): string => {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `MC-ORD-${rand}`;
};

/**
 * Solicita al backend la creación de la orden oficial con Flow Sandbox.
 * Firma con HMAC-SHA256 usando la Secret Key y devuelve la URL de pago de Flow.
 */
export const requestFlowOrder = async (orderData: FlowOrderRequest): Promise<FlowOrderResponse> => {
  const payload = {
    amount: Math.round(orderData.amount),
    email: orderData.email,
    subject: orderData.subject,
    commerceOrder: orderData.commerceOrder,
    urlReturn: `http://localhost:8000/api/v1/pagos/flow/retorno?order=${orderData.commerceOrder}`
  };

  // 1. Intento principal a través del cliente api
  try {
    const res: any = await api.post("/pagos/flow/crear-orden", payload);
    const parsed = res?.data || res;
    if (parsed && typeof parsed === "object" && typeof parsed.success === "boolean") {
      return parsed;
    }
  } catch (err) {
    console.warn("Aviso: reintentando vía fetch directo:", err);
  }

  // 2. Respaldo directo al Gateway para garantizar entrega
  try {
    const rawRes = await fetch("http://localhost:8000/api/v1/pagos/flow/crear-orden", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const jsonRes = await rawRes.json();
    return jsonRes;
  } catch (fetchErr: any) {
    return {
      success: false,
      error: "Error de conexión con el servicio de pagos.",
      message: fetchErr.message
    };
  }
};
