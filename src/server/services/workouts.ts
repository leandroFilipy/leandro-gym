import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, fromDbDate, isoWeekday, startOfIsoWeek, toDbDate, todayIn, type DateStr } from "@/lib/dates";
import { suggestProgression, type ProgressionSuggestion } from "@/lib/domain/progression";
import { bestSet, totalVolume } from "@/lib/domain/volume";
import type { MuscleGroup } from "@/generated/prisma/enums";

// ───────────── Fichas ─────────────

const planInclude = {
  days: {
    orderBy: { weekday: "asc" },
    include: {
      exercises: { orderBy: { order: "asc" }, include: { exercise: true } },
    },
  },
} as const;

export function getActivePlan(userId: string) {
  return db.workoutPlan.findFirst({
    where: { userId, active: true },
    include: planInclude,
  });
}

export function listPlans(userId: string) {
  return db.workoutPlan.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    include: { days: { orderBy: { weekday: "asc" }, include: { _count: { select: { exercises: true } } } } },
  });
}

export function getPlan(userId: string, planId: string) {
  return db.workoutPlan.findFirst({ where: { id: planId, userId }, include: planInclude });
}

export function getDay(userId: string, dayId: string) {
  return db.workoutDay.findFirst({
    where: { id: dayId, plan: { userId } },
    include: {
      plan: { select: { id: true, name: true } },
      exercises: { orderBy: { order: "asc" }, include: { exercise: true } },
    },
  });
}

// ───────────── Exercícios ─────────────

export function listExercises(userId: string, includeArchived = false) {
  return db.exercise.findMany({
    where: { userId, ...(includeArchived ? {} : { archived: false }) },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });
}

// ───────────── Treino de hoje ─────────────

export async function getToday(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const weekday = isoWeekday(today);
  const plan = await getActivePlan(userId);
  const day = plan?.days.find((d) => d.weekday === weekday) ?? null;

  const session = await db.workoutSession.findFirst({
    where: { userId, date: toDbDate(today) },
    orderBy: { startedAt: "desc" },
    select: { id: true, finishedAt: true, name: true },
  });

  const nextDay = plan ? findNextWorkoutDay(plan.days, weekday) : null;
  return { today, weekday, plan, day, session, nextDay };
}

function findNextWorkoutDay<T extends { weekday: number; type: string }>(days: T[], weekday: number) {
  for (let i = 1; i <= 7; i++) {
    const wd = ((weekday - 1 + i) % 7) + 1;
    const d = days.find((x) => x.weekday === wd && x.type !== "REST");
    if (d) return { day: d, inDays: i };
  }
  return null;
}

// ───────────── Último treino de um exercício ─────────────

export async function getPreviousPerformance(userId: string, exerciseId: string, excludeSessionId?: string) {
  const we = await db.workoutExercise.findFirst({
    where: {
      exerciseId,
      session: { userId, ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}) },
      sets: { some: { completed: true } },
    },
    orderBy: { session: { startedAt: "desc" } },
    include: {
      session: { select: { date: true } },
      sets: { where: { completed: true }, orderBy: { setNumber: "asc" } },
    },
  });
  if (!we) return null;
  return {
    date: fromDbDate(we.session.date),
    sets: we.sets.map((s) => ({ weight: s.weight, repetitions: s.repetitions, rir: s.rir })),
  };
}

// ───────────── Sessão (modo academia) ─────────────

export interface GymExercise {
  id: string; // workoutExerciseId
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  plannedSets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  notes: string | null;
  sets: { id: string; setNumber: number; weight: number; repetitions: number; rir: number | null }[];
  previous: { date: DateStr; sets: { weight: number; repetitions: number; rir: number | null }[] } | null;
  suggestion: ProgressionSuggestion;
}

export async function getGymSession(userId: string, sessionId: string) {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
  if (!session) return null;
  const settings = await getSettings(userId);

  const exercises: GymExercise[] = await Promise.all(
    session.exercises.map(async (we) => {
      const previous = await getPreviousPerformance(userId, we.exerciseId, session.id);
      return {
        id: we.id,
        exerciseId: we.exerciseId,
        name: we.exercise.name,
        muscleGroup: we.exercise.muscleGroup,
        plannedSets: we.plannedSets,
        repMin: we.repMin,
        repMax: we.repMax,
        restSeconds: we.restSeconds,
        notes: we.notes ?? we.exercise.notes,
        sets: we.sets
          .filter((s) => s.completed)
          .map((s) => ({ id: s.id, setNumber: s.setNumber, weight: s.weight, repetitions: s.repetitions, rir: s.rir })),
        previous,
        suggestion: suggestProgression({
          lastSets: previous?.sets ?? [],
          plannedSets: we.plannedSets,
          repMin: we.repMin,
          repMax: we.repMax,
          incrementKg: settings.weightIncrementKg,
          stepKg: settings.weightStepKg,
        }),
      };
    }),
  );

  return {
    id: session.id,
    name: session.name,
    date: fromDbDate(session.date),
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    exercises,
    settings: {
      weightStepKg: settings.weightStepKg,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
    },
  };
}

export type GymSessionData = NonNullable<Awaited<ReturnType<typeof getGymSession>>>;

// ───────────── Resumo da sessão ─────────────

export async function getSessionSummary(userId: string, sessionId: string) {
  const session = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: { exercise: true, sets: { where: { completed: true }, orderBy: { setNumber: "asc" } } },
      },
    },
  });
  if (!session) return null;

  const allSets = session.exercises.flatMap((e) => e.sets);
  const volume = totalVolume(allSets);

  // Volume do treino anterior do mesmo dia da ficha (ou mesmo nome).
  const previous = await db.workoutSession.findFirst({
    where: {
      userId,
      id: { not: session.id },
      startedAt: { lt: session.startedAt },
      ...(session.workoutDayId ? { workoutDayId: session.workoutDayId } : { name: session.name }),
    },
    orderBy: { startedAt: "desc" },
    include: { exercises: { include: { sets: { where: { completed: true } } } } },
  });
  const previousVolume = previous ? totalVolume(previous.exercises.flatMap((e) => e.sets)) : null;

  const records = await db.personalRecord.findMany({
    where: { userId, set: { workoutExercise: { sessionId: session.id } } },
    include: { exercise: { select: { name: true } } },
  });

  const durationMin =
    session.finishedAt ? Math.round((session.finishedAt.getTime() - session.startedAt.getTime()) / 60000) : null;

  return {
    id: session.id,
    name: session.name,
    date: fromDbDate(session.date),
    finished: Boolean(session.finishedAt),
    durationMin,
    volume,
    previousVolume,
    setCount: allSets.length,
    exercises: session.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      sets: e.sets,
      volume: totalVolume(e.sets),
    })),
    records: records.map((r) => ({ exercise: r.exercise.name, weight: r.weight, repetitions: r.repetitions })),
  };
}

export function listSessions(userId: string, take = 30) {
  return db.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take,
    include: {
      exercises: { include: { sets: { where: { completed: true }, select: { weight: true, repetitions: true } } } },
    },
  });
}

export async function getLastFinishedSession(userId: string) {
  const s = await db.workoutSession.findFirst({
    where: { userId, finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: { exercises: { include: { sets: { where: { completed: true } } } } },
  });
  if (!s) return null;
  const sets = s.exercises.flatMap((e) => e.sets);
  return { id: s.id, name: s.name, date: fromDbDate(s.date), volume: totalVolume(sets), setCount: sets.length };
}

// ───────────── Histórico por exercício ─────────────

export async function getExerciseHistory(userId: string, exerciseId: string) {
  const exercise = await db.exercise.findFirst({ where: { id: exerciseId, userId } });
  if (!exercise) return null;

  const entries = await db.workoutExercise.findMany({
    where: { exerciseId, session: { userId }, sets: { some: { completed: true } } },
    orderBy: { session: { startedAt: "desc" } },
    include: {
      session: { select: { id: true, date: true } },
      sets: { where: { completed: true }, orderBy: { setNumber: "asc" } },
    },
  });

  const records = await db.personalRecord.findMany({
    where: { userId, exerciseId },
    orderBy: { achievedAt: "desc" },
    take: 10,
  });

  return {
    exercise,
    records,
    sessions: entries.map((e) => {
      const best = bestSet(e.sets);
      return {
        sessionId: e.session.id,
        date: fromDbDate(e.session.date),
        sets: e.sets.map((s) => ({ weight: s.weight, repetitions: s.repetitions, rir: s.rir })),
        volume: totalVolume(e.sets),
        topWeight: Math.max(...e.sets.map((s) => s.weight)),
        totalReps: e.sets.reduce((sum, s) => sum + s.repetitions, 0),
        best: best ? { weight: best.weight, repetitions: best.repetitions } : null,
      };
    }),
  };
}

// ───────────── Calendário semanal ─────────────

export type DayStatus = "done" | "missed" | "today" | "future" | "rest";

export async function getWeekCalendar(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const monday = startOfIsoWeek(today);
  const plan = await getActivePlan(userId);

  const sessions = await db.workoutSession.findMany({
    where: {
      userId,
      date: { gte: toDbDate(monday), lte: toDbDate(addDays(monday, 6)) },
      OR: [{ finishedAt: { not: null } }, { exercises: { some: { sets: { some: { completed: true } } } } }],
    },
    select: { id: true, date: true, name: true },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const weekday = i + 1;
    const planDay = plan?.days.find((d) => d.weekday === weekday) ?? null;
    const session = sessions.find((s) => fromDbDate(s.date) === date) ?? null;
    const isRest = !planDay || planDay.type === "REST";

    let status: DayStatus;
    if (session) status = "done";
    else if (isRest) status = "rest";
    else if (date < today) status = "missed";
    else if (date === today) status = "today";
    else status = "future";

    return {
      date,
      weekday,
      name: session?.name ?? planDay?.name ?? "Descanso",
      dayId: planDay?.id ?? null,
      status,
      sessionId: session?.id ?? null,
    };
  });

  const planned = days.filter((d) => d.status !== "rest" || d.sessionId).length;
  const done = days.filter((d) => d.status === "done").length;
  return { today, days, planned, done };
}
