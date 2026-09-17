"use server";

import bcrypt from "bcryptjs";
import { signOut } from "@/auth";
import { db } from "../db";
import { requireUserId } from "../session";
import { deletePhotos } from "../storage/photos";
import { fail, type ActionResult } from "./_utils";

/**
 * Exclui a conta e TODOS os dados (irreversível). Pede a senha de novo. A ordem importa:
 * refeições, fichas e treinos primeiro (referenciam alimentos/exercícios com Restrict), depois o
 * usuário (o resto sai em cascata). Fotos no Blob são apagadas no fim.
 */
export async function deleteAccountAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (confirm.trim().toUpperCase() !== "EXCLUIR") return fail('Digite EXCLUIR para confirmar');

  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return fail("Senha incorreta");

  const photos = await db.bodyPhoto.findMany({ where: { userId }, select: { imageUrl: true, thumbUrl: true } });
  await db.$transaction([
    db.meal.deleteMany({ where: { userId } }),
    db.workoutPlan.deleteMany({ where: { userId } }),
    db.workoutSession.deleteMany({ where: { userId } }),
    db.authThrottle.deleteMany({ where: { key: { in: [`login:email:${user.email}`, `reset:email:${user.email}`] } } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  await deletePhotos(photos.flatMap((p) => [p.imageUrl, p.thumbUrl])).catch((e) => console.error("[deleteAccountAction] fotos", e));

  await signOut({ redirectTo: "/login?conta=excluida" });
  return fail("Conta excluída"); // não chega aqui: signOut redireciona
}
