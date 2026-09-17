import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, addMonths, daysBetween, fromDbDate, isoWeekday, monthOf, monthRange, toDbDate, todayIn, type DateStr, type MonthStr } from "@/lib/dates";
import { navySeries } from "@/lib/domain/body-fat";
import { estimate1RM, percentChange, totalVolume } from "@/lib/domain/volume";
import { averageBetween } from "@/lib/domain/weight";
import { getMeasurements, getWeightSeries } from "./body";
import { getActiveGoal, getDailyTotals } from "./nutrition";
import { bestSetsForExercises } from "./records";

// Relatório do mês: treino, força, corpo e dieta num lugar só (para guardar ou mandar ao
// personal/nutricionista).

async function monthSessions(userId: string, start: DateStr, end: DateStr) {
  const sessions = await db.workoutSession.findMany({
    where: { userId, date: { gte: toDbDate(start), lte: toDbDate(end) } },
    include: { exercises: { include: { exercise: { select: { name: true } }, sets: { where: { completed: true } } } } },
  });
  return sessions.filter((s) => s.finishedAt || s.exercises.some((e) => e.sets.length));
}

export async function getMonthlyReport(userId: string, month: MonthStr) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const { start, end: monthEnd } = monthRange(month);
  const isCurrent = month === monthOf(today);
  const end = isCurrent ? today : monthEnd;
  const prev = monthRange(addMonths(month, -1));

  const [sessions, prevSessions, plan, weights, measurements, nutrition, goal, records] = await Promise.all([
    monthSessions(userId, start, end),
    monthSessions(userId, prev.start, prev.end),
    db.workoutPlan.findFirst({ where: { userId, active: true }, select: { days: { select: { weekday: true, type: true } } } }),
    getWeightSeries(userId, addDays(start, -7)),
    getMeasurements(userId),
    getDailyTotals(userId, start, end),
    getActiveGoal(userId, end),
    db.personalRecord.findMany({
      where: { userId, achievedAt: { gte: toDbDate(start), lt: toDbDate(addDays(end, 1)) } },
      include: { exercise: { select: { name: true } } },
    }),
  ]);

  // ── Treino
  const sets = sessions.flatMap((s) => s.exercises.flatMap((e) => e.sets));
  const volume = totalVolume(sets);
  const prevVolume = totalVolume(prevSessions.flatMap((s) => s.exercises.flatMap((e) => e.sets)));
  const trainingWeekdays = new Set(plan?.days.filter((d) => d.type !== "REST").map((d) => d.weekday) ?? []);
  let planned = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (trainingWeekdays.has(isoWeekday(d))) planned++;
  const minutes = sessions
    .filter((s) => s.finishedAt)
    .reduce((sum, s) => sum + Math.max(0, (s.finishedAt!.getTime() - s.startedAt.getTime()) / 60000 - s.pausedSeconds / 60), 0);

  // Evolução de força: melhor 1RM estimado do mês × melhor antes do mês, por exercício.
  const bestThisMonth = new Map<string, { name: string; e1rm: number }>();
  for (const s of sessions)
    for (const e of s.exercises)
      for (const set of e.sets) {
        const v = estimate1RM(set.weight, set.repetitions);
        const cur = bestThisMonth.get(e.exerciseId);
        if (!cur || v > cur.e1rm) bestThisMonth.set(e.exerciseId, { name: e.exercise.name, e1rm: v });
      }
  const before = await bestSetsForExercises(userId, [...bestThisMonth.keys()], toDbDate(start));
  const bestBefore = new Map([...before].filter(([, b]) => b.e1rm > 0).map(([id, b]) => [id, b.e1rm]));
  const strength = [...bestThisMonth.entries()]
    .filter(([id]) => bestBefore.has(id))
    .map(([id, b]) => ({ name: b.name, before: bestBefore.get(id)!, now: b.e1rm, pct: percentChange(b.e1rm, bestBefore.get(id)!) ?? 0 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);

  // ── Corpo
  const inMonth = weights.filter((w) => w.date >= start && w.date <= end);
  const weightStart = inMonth.length ? (averageBetween(weights, start, addDays(start, 6)) ?? inMonth[0].value) : null;
  const weightEnd = inMonth.length ? (averageBetween(weights, addDays(end, -6), end) ?? inMonth.at(-1)!.value) : null;
  const fat = settings.sex && settings.heightCm ? navySeries(measurements, settings.sex, settings.heightCm).filter((p) => p.date >= start && p.date <= end) : [];
  const waist = measurements.filter((m) => m.date >= start && m.date <= end && typeof m.waist === "number");

  // ── Dieta
  const logged = nutrition.filter((n) => n.kcal > 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const proteinDays = goal ? logged.filter((n) => n.protein >= goal.protein * 0.9).length : null;

  return {
    month,
    start,
    end,
    isCurrent,
    workouts: {
      done: sessions.length,
      planned,
      sets: sets.length,
      volume: Math.round(volume),
      volumeChangePct: percentChange(volume, prevVolume),
      hours: Math.round((minutes / 60) * 10) / 10,
    },
    records: records
      .sort((a, b) => b.estimated1RM - a.estimated1RM)
      .map((r) => ({ exercise: r.exercise.name, weight: r.weight, repetitions: r.repetitions, date: fromDbDate(r.achievedAt) })),
    strength,
    body: {
      weightStart: weightStart !== null ? Math.round(weightStart * 10) / 10 : null,
      weightEnd: weightEnd !== null ? Math.round(weightEnd * 10) / 10 : null,
      fatStart: fat[0]?.value ?? null,
      fatEnd: fat.length > 1 ? fat.at(-1)!.value : null,
      waistStart: waist[0]?.waist ?? null,
      waistEnd: waist.length > 1 ? (waist.at(-1)!.waist ?? null) : null,
    },
    diet: {
      daysLogged: logged.length,
      days: daysBetween(start, end) + 1,
      avgKcal: avg(logged.map((n) => n.kcal)),
      avgProtein: avg(logged.map((n) => n.protein)),
      goalKcal: goal?.kcal ?? null,
      goalProtein: goal?.protein ?? null,
      proteinDays,
    },
  };
}

export type MonthlyReport = Awaited<ReturnType<typeof getMonthlyReport>>;
