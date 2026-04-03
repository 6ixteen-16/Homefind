import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // Redirect unauthenticated users away from admin pages
  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    !isLoggedIn
  ) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Block unauthenticated admin API calls
  if (pathname.startsWith("/api/admin") && !isLoggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.next();

  // Prevent caching of admin pages
  if (pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}) as any;

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
