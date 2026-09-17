import "server-only";
import { createHash } from "node:crypto";
import { db } from "../db";

export const hashResetToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const isResetTokenFormat = (token: string) => /^[\w-]{20,100}$/.test(token);

/** Token existe, não foi usado e não expirou? */
export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!isResetTokenFormat(token)) return false;
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) }, select: { usedAt: true, expiresAt: true } });
  return Boolean(row && !row.usedAt && row.expiresAt > new Date());
}
