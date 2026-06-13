import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Auth pages: reachable when logged out, bounce to the app when logged in.
const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.some((r) => pathname.startsWith(r));
  const isLanding = pathname === "/";
  const isAuthenticated = !!req.auth && !req.auth.error;

  // Signed-in users shouldn't see the auth pages
  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // The marketing landing page and auth pages are public for everyone
  if (isLanding || isAuthPage) {
    return NextResponse.next();
  }

  // Everything else requires a session
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Protect everything except NextAuth routes, static assets, and files
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
