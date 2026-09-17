"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../db";
import { getEmailSender, passwordResetEmail } from "../email";
import { hashResetToken, isResetTokenFormat } from "../services/password-reset";
import { requestIp, throttleClear, throttleHit, throttleLocked } from "../throttle";
import { RESET_POLICY } from "@/lib/domain/throttle";
import { fail, ok, validate, type ActionResult } from "./_utils";

const TOKEN_TTL_MS = 60 * 60_000;

async function appOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
}

const emailSchema = z.object({ email: z.email("E-mail inválido").transform((e) => e.toLowerCase().trim()) });

/**
 * Pede o link de redefinição. A resposta é sempre a mesma, exista ou não a conta (não revela
 * quem está cadastrado). Limite: 3 pedidos por hora por e-mail e 10 por IP.
 */
export async function requestPasswordResetAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { data, error } = validate(emailSchema, { email: fd.get("email") });
  if (error !== undefined) return fail(error);

  const emailKey = `reset:email:${data.email}`;
  const ipKey = `reset:ip:${await requestIp()}`;
  const locked = (await throttleLocked(emailKey)) ?? (await throttleLocked(ipKey));
  if (locked) return fail(`Muitos pedidos seguidos. Tente de novo em ${locked} min.`);
  await throttleHit(emailKey, RESET_POLICY);
  await throttleHit(ipKey, { ...RESET_POLICY, maxFailures: 10 });

  const user = await db.user.findUnique({ where: { email: data.email }, select: { id: true, name: true, email: true } });
  if (user) {
    const token = randomBytes(32).toString("base64url");
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashResetToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    const { subject, html, text } = passwordResetEmail({ name: user.name ?? "", url: `${await appOrigin()}/redefinir-senha/${token}` });
    try {
      await getEmailSender().send({ to: user.email, subject, html, text });
    } catch (e) {
      console.error("[password-reset] falha ao enviar e-mail", e);
      return fail("Não foi possível enviar o e-mail agora. Tente de novo em alguns minutos.");
    }
  }
  return ok;
}

const newPasswordSchema = z
  .object({
    token: z.string().refine(isResetTokenFormat, "Link inválido"),
    password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não são iguais", path: ["confirm"] });

export async function resetPasswordAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const { data, error } = validate(newPasswordSchema, { token: fd.get("token"), password: fd.get("password"), confirm: fd.get("confirm") });
  if (error !== undefined) return fail(error);

  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(data.token) }, include: { user: { select: { email: true } } } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) return fail("Este link expirou ou já foi usado. Peça um novo.");

  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: row.userId, id: { not: row.id } } }),
  ]);
  // Senha nova libera o bloqueio de login da conta.
  await throttleClear(`login:email:${row.user.email}`);
  redirect("/login?senha=redefinida");
}
