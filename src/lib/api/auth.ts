import axios from "axios";
import { apiClient, API_BASE_URL } from "./client";
import type { LoginResponse, User } from "@/types";

// Auth endpoints that run BEFORE a session exists use a bare axios call so
// the interceptors (token attach / refresh) never apply.

export const authApi = {
  login: async (payload: { email: string; password: string }) => {
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/login`,
      payload,
    );
    return data;
  },

  register: async (payload: {
    name: string;
    email: string;
    password: string;
  }) => {
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/register`,
      payload,
    );
    return data;
  },

  /** Exchange a Google ID token (from NextAuth) for our backend session. */
  googleExchange: async (payload: { idToken: string }) => {
    const { data } = await axios.post<LoginResponse>(
      `${API_BASE_URL}/auth/google`,
      payload,
    );
    return data;
  },

  forgotPassword: async (payload: { email: string }) => {
    await axios.post(`${API_BASE_URL}/auth/forgot-password`, payload);
  },

  resetPassword: async (payload: { token: string; password: string }) => {
    await axios.post(`${API_BASE_URL}/auth/reset-password`, payload);
  },

  me: async () => {
    const { data } = await apiClient.get<User>("/auth/me");
    return data;
  },

  logout: async () => {
    await apiClient.post("/auth/logout").catch(() => undefined);
  },
};
