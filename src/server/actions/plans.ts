"use server";

import { z } from "zod";
import { db } from "../db";
import { getSettings, requireUserId } from "../session";
import { DayType } from "@/generated/prisma/enums";
import { fail, ok, refreshApp, validate, type ActionResult } from "./_utils";

const nameSchema = z.string().trim().min(1, "Informe o nome").max(60);

// ───────────── Ficha ─────────────

export async function createPlanAction(name: string): Promise<ActionResult<{ id: string }>> {
  const userId = await requireUserId();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  const hasActive = await db.workoutPlan.count({ where: { userId, active: true } });
  const plan = await db.workoutPlan.create({
    data: {
      userId,
      name: parsed.data,
      active: hasActive === 0,
      days: {
        create: Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, name: "Descanso", type: DayType.REST })),
      },
    },
  });
  refreshApp();
  return { ok: true, data: { id: plan.id } };
}

export async function renamePlanAction(planId: string, name: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  await db.workoutPlan.updateMany({ where: { id: planId, userId }, data: { name: parsed.data } });
  refreshApp();
  return ok;
}

export async function activatePlanAction(planId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const plan = await db.workoutPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) return fail("Ficha não encontrada");
  await db.$transaction([
    db.workoutPlan.updateMany({ where: { userId }, data: { active: false } }),
    db.workoutPlan.update({ where: { id: planId }, data: { active: true } }),
  ]);
  refreshApp();
  return ok;
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.workoutPlan.deleteMany({ where: { id: planId, userId } });
  refreshApp();
  return ok;
}

// ───────────── Dia ─────────────

const daySchema = z.object({
  name: nameSchema,
  type: z.enum(DayType),
});

export async function updateDayAction(dayId: string, input: { name: string; type: DayType }): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(daySchema, input);
  if (error !== undefined) return fail(error);
  const r = await db.workoutDay.updateMany({ where: { id: dayId, plan: { userId } }, data });
  if (!r.count) return fail("Dia não encontrado");
  refreshApp();
  return ok;
}

// ───────────── Exercícios do dia ─────────────

const dayExerciseSchema = z
  .object({
    plannedSets: z.coerce.number().int().min(1).max(20),
    repMin: z.coerce.number().int().min(1).max(100),
    repMax: z.coerce.number().int().min(1).max(100),
    restSeconds: z.coerce.number().int().min(0).max(900),
    notes: z.string().trim().max(300).optional().transform((v) => v || null),
  })
  .refine((v) => v.repMax >= v.repMin, "O máximo de reps deve ser ≥ mínimo");

export type DayExerciseInput = z.input<typeof dayExerciseSchema>;

async function ownsDay(userId: string, dayId: string) {
  return db.workoutDay.findFirst({ where: { id: dayId, plan: { userId } }, select: { id: true } });
}

async function ownsDayExercise(userId: string, id: string) {
  return db.workoutDayExercise.findFirst({
    where: { id, workoutDay: { plan: { userId } } },
    select: { id: true, workoutDayId: true, order: true },
  });
}

export async function addDayExerciseAction(dayId: string, exerciseId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const [day, exercise, settings] = await Promise.all([
    ownsDay(userId, dayId),
    db.exercise.findFirst({ where: { id: exerciseId, userId } }),
    getSettings(userId),
  ]);
  if (!day || !exercise) return fail("Não encontrado");

  const last = await db.workoutDayExercise.findFirst({ where: { workoutDayId: dayId }, orderBy: { order: "desc" } });
  await db.workoutDayExercise.create({
    data: {
      workoutDayId: dayId,
      exerciseId,
      order: (last?.order ?? 0) + 1,
      plannedSets: 3,
      repMin: 8,
      repMax: 12,
      restSeconds: settings.defaultRestSeconds,
    },
  });
  // Dia com exercício deixa de ser descanso automaticamente.
  await db.workoutDay.updateMany({
    where: { id: dayId, type: DayType.REST },
    data: { type: DayType.WORKOUT, name: "Treino" },
  });
  refreshApp();
  return ok;
}

export async function updateDayExerciseAction(id: string, input: DayExerciseInput): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(dayExerciseSchema, input);
  if (error !== undefined) return fail(error);
  if (!(await ownsDayExercise(userId, id))) return fail("Não encontrado");
  await db.workoutDayExercise.update({ where: { id }, data });
  refreshApp();
  return ok;
}

export async function removeDayExerciseAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  await db.workoutDayExercise.deleteMany({ where: { id, workoutDay: { plan: { userId } } } });
  refreshApp();
  return ok;
}

export async function moveDayExerciseAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const userId = await requireUserId();
  const item = await ownsDayExercise(userId, id);
  if (!item) return fail("Não encontrado");

  const neighbor = await db.workoutDayExercise.findFirst({
    where: {
      workoutDayId: item.workoutDayId,
      order: direction === "up" ? { lt: item.order } : { gt: item.order },
    },
    orderBy: { order: direction === "up" ? "desc" : "asc" },
  });
  if (!neighbor) return ok;

  await db.$transaction([
    db.workoutDayExercise.update({ where: { id: item.id }, data: { order: neighbor.order } }),
    db.workoutDayExercise.update({ where: { id: neighbor.id }, data: { order: item.order } }),
  ]);
  refreshApp();
  return ok;
}
