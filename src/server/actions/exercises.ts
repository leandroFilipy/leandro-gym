"use server";

import { z } from "zod";
import { db } from "../db";
import { requireUserId } from "../session";
import { MuscleGroup } from "@/generated/prisma/enums";
import { fail, formToObject, ok, refreshApp, validate, type ActionResult } from "./_utils";

const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  muscleGroup: z.enum(MuscleGroup, "Escolha o grupo muscular"),
  notes: z.string().trim().max(500).optional().transform((v) => v || null),
});

export async function createExerciseAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(exerciseSchema, formToObject(fd));
  if (error !== undefined) return fail(error);

  const existing = await db.exercise.findUnique({ where: { userId_name: { userId, name: data.name } } });
  if (existing && !existing.archived) return fail("Você já tem um exercício com esse nome");

  // Recriar um exercício arquivado com o mesmo nome reativa o antigo (mantém histórico).
  if (existing) await db.exercise.update({ where: { id: existing.id }, data: { ...data, archived: false } });
  else await db.exercise.create({ data: { ...data, userId } });
  refreshApp();
  return ok;
}

export async function updateExerciseAction(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(exerciseSchema, formToObject(fd));
  if (error !== undefined) return fail(error);

  const clash = await db.exercise.findFirst({ where: { userId, name: data.name, id: { not: id } } });
  if (clash) return fail("Você já tem um exercício com esse nome");

  const r = await db.exercise.updateMany({ where: { id, userId }, data });
  if (!r.count) return fail("Exercício não encontrado");
  refreshApp();
  return ok;
}

/** Arquiva (não apaga) para preservar o histórico. */
export async function archiveExerciseAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.exercise.updateMany({ where: { id, userId }, data: { archived: true } });
  refreshApp();
  return ok;
}
