"use server";

import { z } from "zod";
import { db } from "../db";
import { requireUserId } from "../session";
import { isValidDateStr, toDbDate } from "@/lib/dates";
import { fail, refreshApp, validate, type ActionResult } from "./_utils";

const waterSchema = z.object({
  date: z.string().refine(isValidDateStr, "Data inválida"),
  deltaMl: z.number().int().min(-2000).max(2000).refine((n) => n !== 0, "Quantidade inválida"),
});

/** Soma (ou desfaz) água no dia. Nunca fica negativo. Devolve o total atualizado. */
export async function addWaterAction(input: z.input<typeof waterSchema>): Promise<ActionResult<{ ml: number }>> {
  const userId = await requireUserId();
  const { data, error } = validate(waterSchema, input);
  if (error !== undefined) return fail(error);

  const date = toDbDate(data.date);
  const current = await db.waterLog.findUnique({ where: { userId_date: { userId, date } }, select: { ml: true } });
  const ml = Math.min(20_000, Math.max(0, (current?.ml ?? 0) + data.deltaMl));
  await db.waterLog.upsert({ where: { userId_date: { userId, date } }, create: { userId, date, ml }, update: { ml } });
  refreshApp();
  return { ok: true, data: { ml } };
}
