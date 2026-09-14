import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, startOfIsoWeek, toDbDate, todayIn, type DateStr } from "@/lib/dates";
import { percentChange, totalVolume } from "@/lib/domain/volume";
import { averageBetween } from "@/lib/domain/weight";
import { getWeightSeries } from "./body";
import { getDailyTotals } from "./nutrition";
import { getActivePlan } from "./workouts";

/** Formato salvo em WeeklyReport.data (e usado no e-mail futuramente). */
export interface WeeklyReportData {
  weekStart: DateStr;
  weekEnd: DateStr;
  workoutsDone: number;
  workoutsPlanned: number;
  volume: number;
  volumeChangePct: number | null;
  weightStart: number | null; // média da semana anterior
  weightEnd: number | null; // média da semana
  avgKcal: number | null;
  avgProtein: number | null;
  daysLogged: number;
  records: { exercise: string; weight: number; repetitions: number }[];
}

async function weekVolume(userId: string, start: DateStr) {
  const sessions = await db.workoutSession.findMany({
    where: { userId, date: { gte: toDbDate(start), lte: toDbDate(addDays(start, 6)) } },
    include: { exercises: { include: { sets: { where: { completed: true } } } } },
  });
  const done = sessions.filter((s) => s.finishedAt || s.exercises.some((e) => e.sets.length));
  return { count: done.length, volume: totalVolume(done.flatMap((s) => s.exercises.flatMap((e) => e.sets))) };
}

export async function buildWeeklyReport(userId: string, weekStart: DateStr): Promise<WeeklyReportData> {
  const weekEnd = addDays(weekStart, 6);
  const prevStart = addDays(weekStart, -7);

  const [cur, prev, plan, weights, nutrition, records] = await Promise.all([
    weekVolume(userId, weekStart),
    weekVolume(userId, prevStart),
    getActivePlan(userId),
    getWeightSeries(userId, prevStart),
    getDailyTotals(userId, weekStart, weekEnd),
    db.personalRecord.findMany({
      where: { userId, achievedAt: { gte: toDbDate(weekStart), lt: toDbDate(addDays(weekEnd, 1)) } },
      include: { exercise: { select: { name: true } } },
      orderBy: { achievedAt: "asc" },
    }),
  ]);

  const logged = nutrition.filter((n) => n.kcal > 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return {
    weekStart,
    weekEnd,
    workoutsDone: cur.count,
    workoutsPlanned: plan?.days.filter((d) => d.type !== "REST").length ?? 0,
    volume: Math.round(cur.volume),
    volumeChangePct: percentChange(cur.volume, prev.volume),
    weightStart: averageBetween(weights, prevStart, addDays(prevStart, 6)),
    weightEnd: averageBetween(weights, weekStart, weekEnd),
    avgKcal: avg(logged.map((n) => n.kcal)),
    avgProtein: avg(logged.map((n) => n.protein)),
    daysLogged: logged.length,
    records: records.map((r) => ({ exercise: r.exercise.name, weight: r.weight, repetitions: r.repetitions })),
  };
}

/** Semana atual (offset 0) ou anteriores (offset -1, -2…). */
export async function getWeeklyReport(userId: string, offsetWeeks = 0) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const weekStart = addDays(startOfIsoWeek(today), offsetWeeks * 7);
  return { report: await buildWeeklyReport(userId, weekStart), isCurrent: offsetWeeks === 0 };
}

/** Grava o relatório (usado pelo cron de domingo). */
export async function saveWeeklyReport(userId: string, weekStart: DateStr) {
  const data = await buildWeeklyReport(userId, weekStart);
  return db.weeklyReport.upsert({
    where: { userId_weekStart: { userId, weekStart: toDbDate(weekStart) } },
    create: { userId, weekStart: toDbDate(weekStart), data: { ...data } },
    update: { data: { ...data } },
  });
}
