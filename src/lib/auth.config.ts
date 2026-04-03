import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight NextAuth config used only by middleware.
 * Must NOT import bcryptjs or any Node.js-only module,
 * because middleware runs in the Edge Runtime.
 *
 * The full auth config (with Credentials provider + bcrypt) lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAdminRoute =
        nextUrl.pathname.startsWith("/admin") &&
        !nextUrl.pathname.startsWith("/admin/login");
      const isAdminApi = nextUrl.pathname.startsWith("/api/admin");

      if (isAdminRoute || isAdminApi) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // Providers are added in auth.ts — not here
};
