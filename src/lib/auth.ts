import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios from "axios";
import { API_BASE_URL } from "@/lib/api/client";
import type { LoginResponse } from "@/types";

// ─── Module augmentation: carry backend tokens on the NextAuth session ──────

declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    error?: "RefreshTokenError";
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

interface BackendJWT {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  error?: "RefreshTokenError";
}

async function refreshBackendToken(token: BackendJWT): Promise<BackendJWT> {
  try {
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }>(`${API_BASE_URL}/auth/refresh`, { refreshToken: token.refreshToken });
    return { ...token, ...data, error: undefined };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const { data } = await axios.post<LoginResponse>(
            `${API_BASE_URL}/auth/login`,
            {
              email: credentials.email,
              password: credentials.password,
            },
          );
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            image: data.user.avatarUrl,
            // smuggled through to the jwt callback below
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
          } as never;
        } catch {
          return null; // NextAuth surfaces this as CredentialsSignin
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in with credentials: tokens came from authorize()
      if (user && account?.provider === "credentials") {
        const u = user as unknown as BackendJWT & { id: string };
        return {
          ...token,
          userId: u.id,
          accessToken: u.accessToken,
          refreshToken: u.refreshToken,
          expiresAt: u.expiresAt,
        };
      }

      // Initial sign-in with Google: exchange the Google ID token for a
      // backend-issued session so the API recognizes this user/tenant.
      if (user && account?.provider === "google" && account.id_token) {
        try {
          const { data } = await axios.post<LoginResponse>(
            `${API_BASE_URL}/auth/google`,
            { idToken: account.id_token },
          );
          return {
            ...token,
            userId: data.user.id,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
          };
        } catch {
          return { ...token, error: "RefreshTokenError" as const };
        }
      }

      const t = token as unknown as BackendJWT;

      // Refresh 60s before expiry to avoid racing the boundary.
      if (t.expiresAt && Date.now() > t.expiresAt - 60_000) {
        return (await refreshBackendToken(t)) as never;
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as unknown as BackendJWT;
      session.user.id = t.userId;
      session.accessToken = t.accessToken;
      session.refreshToken = t.refreshToken;
      session.expiresAt = t.expiresAt;
      session.error = t.error;
      return session;
    },
  },
});
