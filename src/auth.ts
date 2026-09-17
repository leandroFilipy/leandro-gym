import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { db } from "@/server/db";
import { clientIp, throttleClear, throttleHit, throttleLocked } from "@/server/throttle";
import { LOGIN_EMAIL_POLICY, LOGIN_IP_POLICY } from "@/lib/domain/throttle";

const credentialsSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

/** Muitas tentativas erradas: a tela de login mostra quanto tempo falta. */
export class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        // Bloqueio por e-mail (protege a conta) e por IP (protege contra varredura de contas).
        const emailKey = `login:email:${parsed.data.email}`;
        const ipKey = `login:ip:${clientIp(request.headers)}`;
        const [emailLock, ipLock] = await Promise.all([throttleLocked(emailKey), throttleLocked(ipKey)]);
        if (emailLock || ipLock) {
          const e = new TooManyAttempts();
          e.code = `rate_limited:${Math.max(emailLock ?? 0, ipLock ?? 0)}`;
          throw e;
        }

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        const ok = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
        if (!user || !ok) {
          await Promise.all([throttleHit(emailKey, LOGIN_EMAIL_POLICY), throttleHit(ipKey, LOGIN_IP_POLICY)]);
          return null;
        }
        await throttleClear(emailKey);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
