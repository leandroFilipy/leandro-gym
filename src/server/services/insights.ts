import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, fromDbDate, startOfIsoWeek, toDbDate, todayIn } from "@/lib/dates";
import { analyzeMuscleVolume } from "@/lib/domain/muscle-volume";
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
