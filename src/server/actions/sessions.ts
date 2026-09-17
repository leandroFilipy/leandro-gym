"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "../db";
import { getSettings, requireUserId } from "../session";
import { todayIn, toDbDate } from "@/lib/dates";
import { readinessScore } from "@/lib/domain/readiness";
import { fail, ok, refreshApp, validate, type ActionResult } from "./_utils";

/** Inicia (ou retoma) o treino de um dia da ficha e abre o modo academia. */
export async function startSessionAction(workoutDayId: string) {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const today = toDbDate(todayIn(settings.timezone));

  const day = await db.workoutDay.findFirst({
    where: { id: workoutDayId, plan: { userId } },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!day) redirect("/treino");

  const open = await db.workoutSession.findFirst({
    where: { userId, workoutDayId, date: today, finishedAt: null },
    select: { id: true, exercises: { select: { exerciseId: true } } },
  });
  if (open) {
    // Exercícios adicionados à ficha depois que o treino começou entram no fim da sessão.
    const inSession = new Set(open.exercises.map((e) => e.exerciseId));
    const missing = day.exercises.filter((e) => !inSession.has(e.exerciseId));
    if (missing.length) {
      await db.workoutExercise.createMany({
        data: missing.map((e, i) => ({
          sessionId: open.id,
          exerciseId: e.exerciseId,
          order: open.exercises.length + i + 1,
          plannedSets: e.plannedSets,
          repMin: e.repMin,
          repMax: e.repMax,
          restSeconds: e.restSeconds,
          notes: e.notes,
        })),
      });
      refreshApp();
    }
    redirect(`/treino/sessao/${open.id}`);
  }

  const session = await db.workoutSession.create({
    data: {
      userId,
      workoutDayId: day.id,
      name: day.name,
      date: today,
      exercises: {
        create: day.exercises.map((e, i) => ({
          exerciseId: e.exerciseId,
          order: i + 1,
          plannedSets: e.plannedSets,
          repMin: e.repMin,
          repMax: e.repMax,
          restSeconds: e.restSeconds,
          notes: e.notes,
        })),
      },
    },
  });
  refreshApp();
  redirect(`/treino/sessao/${session.id}`);
}

/** Treino livre (sem ficha). Exercícios são adicionados durante a sessão. */
export async function startFreeSessionAction() {
  const userId = await requireUserId();
  const settings = await getSettings(userId);
  const session = await db.workoutSession.create({
    data: { userId, name: "Treino livre", date: toDbDate(todayIn(settings.timezone)) },
  });
  redirect(`/treino/sessao/${session.id}`);
}

export async function addExerciseToSessionAction(sessionId: string, exerciseId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const [session, exercise, settings] = await Promise.all([
    db.workoutSession.findFirst({ where: { id: sessionId, userId }, include: { _count: { select: { exercises: true } } } }),
    db.exercise.findFirst({ where: { id: exerciseId, userId } }),
    getSettings(userId),
  ]);
  if (!session || !exercise) return fail("Não encontrado");

  await db.workoutExercise.create({
    data: {
      sessionId,
      exerciseId,
      order: session._count.exercises + 1,
      plannedSets: 3,
      repMin: 8,
      repMax: 12,
      restSeconds: settings.defaultRestSeconds,
    },
  });
  refreshApp();
  return ok;
}

const readinessSchema = z
  .object({ sleep: z.number().int().min(1).max(5), soreness: z.number().int().min(1).max(5), energy: z.number().int().min(1).max(5) })
  .nullable();

/** Prontidão do dia (ou null = pulou). Ajusta as sugestões de carga da sessão. */
export async function saveReadinessAction(sessionId: string, input: z.input<typeof readinessSchema>): Promise<ActionResult> {
  const userId = await requireUserId();
  const { data, error } = validate(readinessSchema, input);
  if (error !== undefined) return fail(error);

  const r = await db.workoutSession.updateMany({
    where: { id: sessionId, userId },
    data: data
      ? { readinessAskedAt: new Date(), readinessSleep: data.sleep, readinessSoreness: data.soreness, readinessEnergy: data.energy, readinessScore: readinessScore(data) }
      : { readinessAskedAt: new Date() },
  });
  if (!r.count) return fail("Sessão não encontrada");
  refreshApp();
  return ok;
}

/** Pausa o treino em andamento (marca o instante da pausa). */
export async function pauseSessionAction(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const r = await db.workoutSession.updateMany({
    where: { id: sessionId, userId, finishedAt: null, pausedAt: null },
    data: { pausedAt: new Date() },
  });
  if (!r.count) return fail("Sessão não encontrada ou já pausada");
  refreshApp();
  return ok;
}

/** Retoma o treino: acumula o tempo pausado e limpa o marcador de pausa. */
export async function resumeSessionAction(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId, finishedAt: null },
    select: { pausedAt: true, pausedSeconds: true },
  });
  if (!session?.pausedAt) return fail("Sessão não está pausada");
  const extra = Math.max(0, Math.floor((Date.now() - session.pausedAt.getTime()) / 1000));
  await db.workoutSession.updateMany({
    where: { id: sessionId, userId },
    data: { pausedAt: null, pausedSeconds: session.pausedSeconds + extra },
  });
  refreshApp();
  return ok;
}

export async function finishSessionAction(sessionId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  // Se estava pausada, consolida o tempo de pausa antes de finalizar.
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId, finishedAt: null },
    select: { pausedAt: true, pausedSeconds: true },
  });
  const extra = session?.pausedAt ? Math.max(0, Math.floor((Date.now() - session.pausedAt.getTime()) / 1000)) : 0;
  const r = await db.workoutSession.updateMany({
    where: { id: sessionId, userId, finishedAt: null },
    data: { finishedAt: new Date(), pausedAt: null, pausedSeconds: (session?.pausedSeconds ?? 0) + extra },
  });
  if (!r.count) return fail("Sessão não encontrada ou já finalizada");
  refreshApp();
  return ok;
}

/** Reabre (ou continua) a sessão e volta para o modo academia. */
export async function reopenSessionAction(sessionId: string) {
  const userId = await requireUserId();
  await db.workoutSession.updateMany({ where: { id: sessionId, userId }, data: { finishedAt: null } });
  refreshApp();
  redirect(`/treino/sessao/${sessionId}`);
}

export async function deleteSessionAction(sessionId: string) {
  const userId = await requireUserId();
  await db.workoutSession.deleteMany({ where: { id: sessionId, userId } });
  refreshApp();
  redirect("/treino/historico");
}
