import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgStore } from "@/stores/org-store";
import type { ApiError, AuthTokens } from "@/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// ─── Request interceptor: attach access token + tenant header ───────────────

apiClient.interceptors.request.use((config) => {
  const { tokens } = useAuthStore.getState();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  const orgId = useOrgStore.getState().activeOrgId;
  if (orgId) {
    config.headers["X-Organization-Id"] = orgId;
  }
  return config;
});

// ─── Response interceptor: 401 → refresh token once, then retry ─────────────
//
// Concurrent 401s share a single in-flight refresh promise so we never fire
// multiple refresh calls (which would invalidate each other's rotated tokens).

let refreshPromise: Promise<AuthTokens> | null = null;

async function refreshTokens(): Promise<AuthTokens> {
  const { tokens } = useAuthStore.getState();
  if (!tokens?.refreshToken) throw new Error("No refresh token");

  // Plain axios instance: must NOT go through our interceptors.
  const { data } = await axios.post<AuthTokens>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken: tokens.refreshToken },
  );
  useAuthStore.getState().setTokens(data);
  return data;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        refreshPromise ??= refreshTokens().finally(() => {
          refreshPromise = null;
        });
        const fresh = await refreshPromise;
        original.headers.Authorization = `Bearer ${fresh.accessToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login?expired=1";
        }
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

// ─── Error normalization ────────────────────────────────────────────────────

export class AppApiError extends Error {
  code: string;
  status?: number;
  details?: Record<string, string[]>;

  constructor(opts: {
    code: string;
    message: string;
    status?: number;
    details?: Record<string, string[]>;
  }) {
    super(opts.message);
    this.name = "AppApiError";
    this.code = opts.code;
    this.status = opts.status;
    this.details = opts.details;
  }
}

function normalizeError(error: AxiosError<ApiError>): AppApiError {
  if (error.response?.data?.message) {
    return new AppApiError({
      code: error.response.data.code ?? "API_ERROR",
      message: error.response.data.message,
      status: error.response.status,
      details: error.response.data.details,
    });
  }
  if (error.code === "ECONNABORTED") {
    return new AppApiError({
      code: "TIMEOUT",
      message: "The request timed out. Please try again.",
    });
  }
  if (!error.response) {
    return new AppApiError({
      code: "NETWORK",
      message: "Unable to reach the server. Check your connection.",
    });
  }
  return new AppApiError({
    code: "UNKNOWN",
    message: "Something went wrong. Please try again.",
    status: error.response.status,
  });
}
