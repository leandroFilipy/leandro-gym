import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, daysBetween, fromDbDate, startOfIsoWeek, toDbDate, todayIn, type DateStr } from "@/lib/dates";
import { movingAverage } from "@/lib/domain/weight";
import { totalVolume } from "@/lib/domain/volume";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { getWeightSeries } from "./body";
import { getDailyTotals } from "./nutrition";
import { getActivePlan } from "./workouts";

export const RANGES = {
  "7d": { label: "7 dias", days: 7 },
  "30d": { label: "30 dias", days: 30 },
  "3m": { label: "3 meses", days: 91 },
  "6m": { label: "6 meses", days: 182 },
  "1y": { label: "1 ano", days: 365 },
  all: { label: "Tudo", days: null },
} as const;

export type RangeKey = keyof typeof RANGES;

export function parseRange(v: unknown): RangeKey {
  return typeof v === "string" && v in RANGES ? (v as RangeKey) : "30d";
}

export async function getProgress(userId: string, range: RangeKey) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const days = RANGES[range].days;
  const from: DateStr | undefined = days ? addDays(today, -(days - 1)) : undefined;

  const [weights, sessions, nutrition, plan, prCount] = await Promise.all([
    getWeightSeries(userId, from),
    db.workoutSession.findMany({
      where: { userId, ...(from ? { date: { gte: toDbDate(from) } } : {}) },
      orderBy: { date: "asc" },
      include: {
        exercises: {
          include: {
            exercise: { select: { muscleGroup: true } },
            sets: { where: { completed: true }, select: { weight: true, repetitions: true } },
          },
        },
      },
    }),
    getDailyTotals(userId, from ?? "2000-01-01", today),
    getActivePlan(userId),
    db.personalRecord.count({ where: { userId, ...(from ? { achievedAt: { gte: toDbDate(from) } } : {}) } }),
  ]);

  const doneSessions = sessions.filter((s) => s.finishedAt || s.exercises.some((e) => e.sets.length));

  // Séries
  const ma = movingAverage(weights, 7);
  const weightSeries = weights.map((w, i) => ({ date: w.date, peso: w.value, media: Math.round(ma[i].value * 10) / 10 }));

  const sessionSeries = doneSessions.map((s) => {
    const sets = s.exercises.flatMap((e) => e.sets);
    return { date: fromDbDate(s.date), volume: Math.round(totalVolume(sets)), sets: sets.length, name: s.name };
  });

  // Frequência semanal
  const weekMap = new Map<DateStr, number>();
  for (const s of doneSessions) {
    const w = startOfIsoWeek(fromDbDate(s.date));
    weekMap.set(w, (weekMap.get(w) ?? 0) + 1);
  }
  const firstDate = from ?? (doneSessions[0] ? fromDbDate(doneSessions[0].date) : today);
  const weekly: { week: DateStr; treinos: number; volume: number }[] = [];
  for (let w = startOfIsoWeek(firstDate); w <= today; w = addDays(w, 7)) {
    const vol = sessionSeries.filter((s) => startOfIsoWeek(s.date) === w).reduce((n, s) => n + s.volume, 0);
    weekly.push({ week: w, treinos: weekMap.get(w) ?? 0, volume: vol });
  }

  // Músculos (séries por grupo)
  const muscleMap = new Map<MuscleGroup, number>();
  for (const s of doneSessions)
    for (const e of s.exercises) muscleMap.set(e.exercise.muscleGroup, (muscleMap.get(e.exercise.muscleGroup) ?? 0) + e.sets.length);
  const muscles = [...muscleMap.entries()].map(([group, sets]) => ({ group, sets })).sort((a, b) => b.sets - a.sets);

  // Consistência = treinos feitos / treinos planejados no período
  const plannedPerWeek = plan?.days.filter((d) => d.type !== "REST").length ?? 0;
  const spanDays = daysBetween(firstDate, today) + 1;
  const planned = plannedPerWeek * Math.max(1, Math.round(spanDays / 7));
  const consistency = planned ? Math.min(100, Math.round((doneSessions.length / planned) * 100)) : null;

  const monthStart = today.slice(0, 8) + "01";
  const [monthCount, totalCount] = await Promise.all([
    db.workoutSession.count({ where: { userId, date: { gte: toDbDate(monthStart) }, finishedAt: { not: null } } }),
    db.workoutSession.count({ where: { userId, finishedAt: { not: null } } }),
  ]);

  return {
    today,
    weightSeries,
    sessionSeries,
    nutritionSeries: nutrition.map((n) => ({ date: n.date, kcal: Math.round(n.kcal), proteina: Math.round(n.protein) })),
    weekly,
    stats: {
      monthCount,
      totalCount,
      rangeCount: doneSessions.length,
      consistency,
      setCount: sessionSeries.reduce((n, s) => n + s.sets, 0),
      avgWeeklyVolume: weekly.length ? Math.round(weekly.reduce((n, w) => n + w.volume, 0) / weekly.length) : 0,
      prCount,
      muscles,
    },
  };
}
