import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { lockedMinutes, registerFailure, type ThrottlePolicy } from "@/lib/domain/throttle";

/** Minutos de bloqueio restantes para a chave, ou null se liberada. */
export async function throttleLocked(key: string): Promise<number | null> {
  const row = await db.authThrottle.findUnique({ where: { key } });
  return lockedMinutes(row, new Date());
}

/** Conta uma falha/uso na chave (pode bloquear). */
export async function throttleHit(key: string, policy: ThrottlePolicy): Promise<void> {
  const row = await db.authThrottle.findUnique({ where: { key } });
  const next = registerFailure(row, new Date(), policy);
  await db.authThrottle.upsert({ where: { key }, create: { key, ...next }, update: next });
}

export async function throttleClear(key: string): Promise<void> {
  await db.authThrottle.deleteMany({ where: { key } });
}

/** IP do cliente (Vercel preenche x-forwarded-for). */
export function clientIp(h: Headers): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function requestIp(): Promise<string> {
  return clientIp(await headers());
}
