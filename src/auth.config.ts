import type { NextAuthConfig } from "next-auth";

// Parte da configuração sem dependências de Node/Prisma — usada pelo proxy.
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const { pathname } = request.nextUrl;
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
      // Recuperação de senha funciona logado ou não.
      if (pathname.startsWith("/esqueci-senha") || pathname.startsWith("/redefinir-senha")) return true;
      if (isAuthPage) {
        return isLoggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
