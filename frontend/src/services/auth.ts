import { api } from "./api";

export interface User {
  user_id: string;
  rut: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "JEFE_BODEGA" | "TECNICO_TERRENO" | "CLIENTE_CONVENIO" | "CLIENTE_STANDARD";
  is_active: boolean;
  created_at: string;
}

export interface Agreement {
  agreement_id: string;
  company_name: string;
  rut: string;
  credit_limit: number;
  used_credit: number;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  login: async (credentials: any): Promise<LoginResponse> => {
    return api.post<LoginResponse>("/auth/login", credentials);
  },

  register: async (userData: any): Promise<User> => {
    return api.post<User>("/auth/register", userData);
  },

  getMe: async (): Promise<User> => {
    return api.get<User>("/users/me");
  },

  getUsers: async (): Promise<User[]> => {
    return api.get<User[]>("/users");
  },

  createProfile: async (userId: string, profileData: any): Promise<any> => {
    return api.post(`/users/${userId}/profile`, profileData);
  },

  // Agreements CRUD
  createAgreement: async (agreementData: any): Promise<Agreement> => {
    return api.post<Agreement>("/agreements", agreementData);
  },

  getAgreements: async (): Promise<Agreement[]> => {
    return api.get<Agreement[]>("/agreements");
  }
};
