import "server-only";
import { createHash } from "node:crypto";
import { db } from "../db";
import { sendPushToUser } from "../push";
import { describeError, errorGroupKey, truncate } from "@/lib/domain/error-fingerprint";

// Monitoramento próprio: grava erros no banco (tabela ErrorLog), avisa os admins por push quando
// aparece um erro novo e limpa registros com mais de 30 dias. Nunca lança — falhar ao registrar
// um erro não pode derrubar a requisição.

export type ErrorSource = "server" | "client" | "action" | "ai";

export interface ErrorReport {
  source: ErrorSource;
  error: unknown;
  path?: string | null;
  digest?: string | null;
  userId?: string | null;
  userAgent?: string | null;
  /** Detalhes extras (ex.: modelos de IA tentados) guardados junto do stack. */
  details?: string | null;
}

const MAX_PER_GROUP_PER_HOUR = 20; // um loop de erro não enche o banco
const RETENTION_DAYS = 30;

/** E-mails com acesso à página de erros e aos alertas (variável ADMIN_EMAILS, separados por vírgula). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdmin(userId: string): Promise<boolean> {
  const emails = adminEmails();
  if (!emails.length) return false;
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  return Boolean(user && emails.includes(user.email.toLowerCase()));
}

export async function logError(report: ErrorReport): Promise<void> {
  try {
    const { message, stack } = describeError(report.error);
    const fingerprint = createHash("sha256").update(errorGroupKey(report.source, message, report.path)).digest("hex").slice(0, 16);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [recent, seenToday] = await Promise.all([
      db.errorLog.count({ where: { fingerprint, createdAt: { gte: hourAgo } } }),
      db.errorLog.count({ where: { fingerprint, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    ]);
    if (recent >= MAX_PER_GROUP_PER_HOUR) return;

    const fullStack = [report.details, stack].filter(Boolean).join("\n\n");
    await db.errorLog.create({
      data: {
        source: report.source,
        message,
        stack: fullStack ? truncate(fullStack, 10_000) : null,
        path: report.path ? truncate(report.path, 500) : null,
        digest: report.digest ?? null,
        userId: report.userId ?? null,
        userAgent: report.userAgent ? truncate(report.userAgent, 300) : null,
        fingerprint,
      },
    });

    if (seenToday === 0) await alertAdmins(report.source, message, report.path);
    if (Math.random() < 0.05) {
      await db.errorLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000) } } });
    }
  } catch (e) {
    console.error("[monitoring] não foi possível registrar o erro", e);
  }
}

/** Push para os admins no primeiro registro do dia de cada tipo de erro. */
async function alertAdmins(source: ErrorSource, message: string, path: string | null | undefined) {
  const emails = adminEmails();
  if (!emails.length) return;
  const admins = await db.user.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { id: true } });
  await Promise.all(
    admins.map((a) =>
      sendPushToUser(a.id, {
        title: `⚠️ Erro novo (${source})`,
        body: truncate(`${message}${path ? ` · ${path}` : ""}`, 160),
        url: "/perfil/erros",
        tag: "error-alert",
      }),
    ),
  );
}
