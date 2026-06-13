"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgStore } from "@/stores/org-store";

/**
 * Bridges NextAuth → Zustand. The axios client reads tokens synchronously
 * from the auth store; this keeps that store in lockstep with the NextAuth
 * session (including silent refreshes done in the jwt callback).
 */
export function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || session?.error) {
      useAuthStore.getState().logout();
      useOrgStore.getState().reset();
      if (session?.error === "RefreshTokenError") {
        void signOut({ callbackUrl: "/login?expired=1" });
      }
      return;
    }

    if (session?.accessToken) {
      useAuthStore.getState().setSession(
        {
          id: session.user.id,
          email: session.user.email ?? "",
          name: session.user.name ?? "",
          avatarUrl: session.user.image,
          createdAt: "",
        },
        {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        },
      );
    }
  }, [session, status]);

  return null;
}
