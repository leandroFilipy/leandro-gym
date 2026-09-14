"use server";

import { z } from "zod";
import { db } from "../db";
import { requireUserId } from "../session";
import { fail, ok, refreshApp, validate, type ActionResult } from "./_utils";

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

const settingsSchema = z.object({
  defaultRestSeconds: z.coerce.number().int().min(0).max(900),
  weightStepKg: z.coerce.number().positive().max(20),
  weightIncrementKg: z.coerce.number().positive().max(50),
  soundEnabled: checkbox,
  vibrationEnabled: checkbox,
  tdeeKcal: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(800).max(10_000).nullable()),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Fuso horário inválido"),
  dailyEmailEnabled: checkbox,
  dailyEmailTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  weeklyReportEnabled: checkbox,
});

export async function saveSettingsAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const userId = await requireUserId();
  const raw = Object.fromEntries(Object.keys(settingsSchema.shape).map((k) => [k, fd.get(k)]));
  const { data, error } = validate(settingsSchema, raw);
  if (error !== undefined) return fail(error);
  await db.userSettings.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  refreshApp();
  return ok;
}
