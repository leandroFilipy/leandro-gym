"use server";

import { z } from "zod";
import { db } from "../db";
import { requireUserId } from "../session";
import { isValidDateStr, toDbDate } from "@/lib/dates";
import { fail, ok, refreshApp, validate, type ActionResult } from "./_utils";

const weightSchema = z.object({
  date: z.string().refine(isValidDateStr, "Data inválida"),
  weightKg: z.coerce.number().min(20, "Peso inválido").max(400, "Peso inválido"),
});

/** Um registro por dia: salvar de novo no mesmo dia substitui. */
export async function saveWeightAction(input: { date: string; weightKg: number }): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(weightSchema, input);
  if (error !== undefined) return fail(error);
  const date = toDbDate(data.date);
  await db.bodyWeight.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, weightKg: data.weightKg },
    update: { weightKg: data.weightKg },
  });
  refreshApp();
  return ok;
}

export async function deleteWeightAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.bodyWeight.deleteMany({ where: { id, userId } });
  refreshApp();
  return ok;
}
