import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens, User } from "@/types";

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  status: "idle" | "authenticated" | "unauthenticated";
  setSession: (user: User, tokens: AuthTokens) => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      status: "idle",

      setSession: (user, tokens) =>
        set({ user, tokens, status: "authenticated" }),

      setTokens: (tokens) => set({ tokens }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({ user: null, tokens: null, status: "unauthenticated" }),
    }),
    {
      name: "rag.auth",
      // Persist the session so a page refresh keeps the user logged in.
      // For stricter security, swap to httpOnly cookies set by the backend
      // and persist only `user` here.
      partialize: (s) => ({ user: s.user, tokens: s.tokens, status: s.status }),
    },
  ),
);

export const selectIsAuthenticated = (s: AuthState) =>
  s.status === "authenticated" && !!s.tokens;
