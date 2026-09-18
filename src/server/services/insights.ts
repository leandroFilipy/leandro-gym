import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, fromDbDate, startOfIsoWeek, toDbDate, todayIn } from "@/lib/dates";
import { forgottenMuscles } from "@/lib/domain/forgotten-muscles";
import { analyzeMuscleVolume } from "@/lib/domain/muscle-volume";
import { readinessImpact, type ReadinessSample } from "@/lib/domain/readiness";
import { totalVolume } from "@/lib/domain/volume";
import { detectStagnation, type ExerciseSessionLike, type StagnationResult } from "@/lib/domain/stagnation";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { getActivePlan } from "./workouts";

const WINDOW_DAYS = 120; // só olha platôs recentes
const MAX_SESSIONS = 8; // últimas N sessões de cada exercício

export interface StagnationAlert extends StagnationResult {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
}

/** Sessões recentes (com séries concluídas) agrupadas por exercício, mais antigas primeiro. */
async function recentSessionsByExercise(userId: string, since: string, exerciseIds?: string[]) {
  const rows = await db.workoutExercise.findMany({
    where: {
      ...(exerciseIds ? { exerciseId: { in: exerciseIds } } : {}),
      session: { userId, date: { gte: toDbDate(since) } },
      sets: { some: { completed: true } },
    },
    orderBy: { session: { startedAt: "asc" } },
    select: {
      exerciseId: true,
      sessionId: true,
      exercise: { select: { name: true, muscleGroup: true } },
      session: { select: { date: true } },
      sets: { where: { completed: true }, select: { weight: true, repetitions: true, rir: true } },
    },
  });

  const map = new Map<string, { name: string; muscleGroup: MuscleGroup; sessions: Map<string, ExerciseSessionLike> }>();
  for (const r of rows) {
    const entry = map.get(r.exerciseId) ?? { name: r.exercise.name, muscleGroup: r.exercise.muscleGroup, sessions: new Map() };
    // O mesmo exercício pode aparecer 2× na sessão: junta as séries.
    const prev = entry.sessions.get(r.sessionId);
    entry.sessions.set(r.sessionId, { date: fromDbDate(r.session.date), sets: [...(prev?.sets ?? []), ...r.sets] });
    map.set(r.exerciseId, entry);
  }
  return map;
}

/** Exercícios da ficha ativa (ou treinados recentemente) que estão em platô/regressão. */
export async function getStagnationAlerts(userId: string): Promise<StagnationAlert[]> {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const plan = await getActivePlan(userId);

  const planParams = new Map<string, { repMin: number; repMax: number }>();
  for (const d of plan?.days ?? []) for (const e of d.exercises) planParams.set(e.exerciseId, { repMin: e.repMin, repMax: e.repMax });

  const byExercise = await recentSessionsByExercise(
    userId,
    addDays(today, -WINDOW_DAYS),
    planParams.size ? [...planParams.keys()] : undefined,
  );

  const alerts: StagnationAlert[] = [];
  for (const [exerciseId, e] of byExercise) {
    const sessions = [...e.sessions.values()].slice(-MAX_SESSIONS);
    const r = detectStagnation(sessions, { stepKg: settings.weightStepKg, ...planParams.get(exerciseId) });
    if (r.status === "stalled" || r.status === "regressing") alerts.push({ ...r, exerciseId, name: e.name, muscleGroup: e.muscleGroup });
  }
  // Regressão primeiro, depois platôs mais longos.
  return alerts.sort((a, b) => Number(b.status === "regressing") - Number(a.status === "regressing") || b.sessionsSinceImprovement - a.sessionsSinceImprovement);
}

/** Análise de platô de um exercício (página de histórico). */
export async function getExerciseStagnation(userId: string, exerciseId: string): Promise<StagnationResult> {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const [byExercise, dayExercise] = await Promise.all([
    recentSessionsByExercise(userId, addDays(today, -WINDOW_DAYS), [exerciseId]),
    db.workoutDayExercise.findFirst({
      where: { exerciseId, workoutDay: { plan: { userId, active: true } } },
      select: { repMin: true, repMax: true },
    }),
  ]);
  const sessions = [...(byExercise.get(exerciseId)?.sessions.values() ?? [])].slice(-MAX_SESSIONS);
  return detectStagnation(sessions, { stepKg: settings.weightStepKg, ...(dayExercise ?? {}) });
}

/** Séries por grupo muscular na semana ISO atual × ficha ativa × faixa-alvo. */
export async function getWeeklyMuscleVolume(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const monday = startOfIsoWeek(today);

  const [plan, rows] = await Promise.all([
    getActivePlan(userId),
    db.workoutExercise.findMany({
      where: { session: { userId, date: { gte: toDbDate(monday), lte: toDbDate(addDays(monday, 6)) } } },
      select: { exercise: { select: { muscleGroup: true } }, _count: { select: { sets: { where: { completed: true } } } } },
    }),
  ]);

  const done: Partial<Record<MuscleGroup, number>> = {};
  for (const r of rows) done[r.exercise.muscleGroup] = (done[r.exercise.muscleGroup] ?? 0) + r._count.sets;

  const planned: Partial<Record<MuscleGroup, number>> = {};
  for (const d of plan?.days ?? []) {
    if (d.type === "REST") continue;
    for (const e of d.exercises) planned[e.exercise.muscleGroup] = (planned[e.exercise.muscleGroup] ?? 0) + e.plannedSets;
  }

  return { weekStart: monday, hasPlan: Boolean(plan), rows: analyzeMuscleVolume(done, planned) };
}

// ───────────── Músculos esquecidos ─────────────

const FORGOTTEN_WINDOW_DAYS = 90;

/** Grupos da ficha ativa sem nenhuma série concluída há 10+ dias. */
export async function getForgottenMuscles(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);

  const [plan, rows] = await Promise.all([
    getActivePlan(userId),
    db.workoutExercise.findMany({
      where: { session: { userId, date: { gte: toDbDate(addDays(today, -FORGOTTEN_WINDOW_DAYS)) } }, sets: { some: { completed: true } } },
      select: { exercise: { select: { muscleGroup: true } }, session: { select: { date: true } } },
    }),
  ]);
  if (!plan) return [];

  const lastTrained: Partial<Record<MuscleGroup, string>> = {};
  let lastAny: string | null = null;
  for (const r of rows) {
    const date = fromDbDate(r.session.date);
    const g = r.exercise.muscleGroup;
    if (!lastTrained[g] || date > lastTrained[g]!) lastTrained[g] = date;
    if (!lastAny || date > lastAny) lastAny = date;
  }

  const planned = plan.days
    .filter((d) => d.type !== "REST")
    .flatMap((d) => d.exercises.map((e) => ({ group: e.exercise.muscleGroup, dayName: d.name })));

  return forgottenMuscles({ planned, lastTrained, today, trainedRecently: lastAny !== null && lastAny >= addDays(today, -7) });
}

// ───────────── Prontidão × desempenho ─────────────

const READINESS_WINDOW_DAYS = 180;

/**
 * Para cada treino com prontidão respondida: volume ÷ volume do treino anterior do mesmo dia da
 * ficha. Mostra se sono, dor e energia realmente mudam o rendimento.
 */
export async function getReadinessInsight(userId: string) {
  const settings = await getSettings(userId);
  const since = addDays(todayIn(settings.timezone), -READINESS_WINDOW_DAYS);
  const sessions = await db.workoutSession.findMany({
    where: { userId, finishedAt: { not: null }, workoutDayId: { not: null }, date: { gte: toDbDate(since) } },
    orderBy: { startedAt: "asc" },
    select: {
      workoutDayId: true,
      readinessScore: true,
      exercises: { select: { sets: { where: { completed: true }, select: { weight: true, repetitions: true } } } },
    },
  });

  const lastVolumeByDay = new Map<string, number>();
  const samples: ReadinessSample[] = [];
  let answered = 0;
  for (const s of sessions) {
    const volume = totalVolume(s.exercises.flatMap((e) => e.sets));
    if (volume <= 0) continue;
    const previous = lastVolumeByDay.get(s.workoutDayId!);
    if (s.readinessScore !== null) {
      answered++;
      if (previous) samples.push({ score: s.readinessScore, volumeRatio: volume / previous });
    }
    lastVolumeByDay.set(s.workoutDayId!, volume);
  }
  return { answered, ...readinessImpact(samples) };
}
