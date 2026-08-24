const API_GATEWAY_URL = "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

export class APIError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    const msg = data?.message || 
                (typeof data?.detail === 'string' ? data.detail : null) || 
                (Array.isArray(data?.detail) ? data.detail.map((d: any) => d.msg).join(", ") : null) ||
                "Ocurrió un error al procesar la petición.";
    super(msg);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;
  
  // 1. Build URL with query params if provided
  let url = `${API_GATEWAY_URL}/${endpoint.replace(/^\//, "")}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // 2. Prepare headers with JWT token
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("marcom_token");
  if (token) {
    defaultHeaders["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: customConfig.method || "GET",
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customConfig,
  };

  // 3. Perform request
  try {
    const response = await fetch(url, config);
    
    // Parse JSON safely
    let data: any = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : null;
    }

    // 4. Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401) {
        // Clear auth and trigger redirect if unauthorized
        localStorage.removeItem("marcom_token");
        localStorage.removeItem("marcom_user");
        if (!window.location.pathname.endsWith("/login")) {
          window.location.href = "/login";
        }
      }
      throw new APIError(response.status, data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new Error("Error de conexión con el servidor. Por favor verifica tu red.");
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "GET" }),
    
  post: <T>(endpoint: string, body: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
    
  put: <T>(endpoint: string, body: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
    
  patch: <T>(endpoint: string, body: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
