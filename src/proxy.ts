import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Checagem otimista de login. A autorização real acontece em requireUserId().
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
