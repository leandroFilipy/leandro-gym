import "server-only";
import webpush from "web-push";
import { db } from "@/server/db";

/** Payload entregue ao service worker (evento `push`). */
export interface PushPayload {
  title: string;
  body: string;
  url?: string; // rota aberta ao clicar
  tag?: string;
}

let configured = false;

/** Configura o VAPID uma única vez. Retorna false se as chaves não estão definidas. */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  const subject = process.env.VAPID_SUBJECT || "mailto:admin@leandrogym.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Chave pública exposta ao cliente (para `pushManager.subscribe`). */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

/**
 * Envia um push para todas as inscrições de um usuário. Inscrições expiradas
 * (404/410) são removidas automaticamente. Retorna quantos foram entregues.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;

  const subs = await db.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
        delivered++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) staleIds.push(sub.id);
      }
    }),
  );

  if (staleIds.length) {
    await db.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }

  return delivered;
}
