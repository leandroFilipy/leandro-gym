import "server-only";
import type { NextRequest } from "next/server";

/**
 * Valida o segredo do cron. Aceita `Authorization: Bearer <CRON_SECRET>`
 * (formato usado pelo Vercel Cron) ou `?secret=<CRON_SECRET>` como alternativa.
 * Sem `CRON_SECRET` definido, nega tudo (evita expor as rotas por engano).
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  return req.nextUrl.searchParams.get("secret") === secret;
}
