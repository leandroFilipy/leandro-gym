import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, daysBetween, fromDbDate, startOfIsoWeek, toDbDate, todayIn } from "@/lib/dates";
import { buildMuscleMap, type MapPeriod } from "@/lib/domain/muscle-map";
import type { MuscleGroup } from "@/generated/prisma/enums";

const LAST_TRAINED_WINDOW = 120;

/** Séries por músculo no período + última vez que cada um foi treinado + exercícios que pegaram. */
export async function getMuscleMap(userId: string, period: MapPeriod) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const from = period === "hoje" ? today : period === "semana" ? startOfIsoWeek(today) : addDays(today, -29);

  const rows = await db.workoutExercise.findMany({
    where: { session: { userId, date: { gte: toDbDate(addDays(today, -LAST_TRAINED_WINDOW)), lte: toDbDate(today) } }, sets: { some: { completed: true } } },
    select: {
      exercise: { select: { name: true, muscleGroup: true } },
      session: { select: { date: true } },
      _count: { select: { sets: { where: { completed: true } } } },
    },
  });

  const sets: Partial<Record<MuscleGroup, number>> = {};
  const exercises = new Map<MuscleGroup, Map<string, number>>();
  const lastDate: Partial<Record<MuscleGroup, string>> = {};

  for (const r of rows) {
    const g = r.exercise.muscleGroup;
    const date = fromDbDate(r.session.date);
    if (!lastDate[g] || date > lastDate[g]!) lastDate[g] = date;
    if (date < from) continue;
    sets[g] = (sets[g] ?? 0) + r._count.sets;
    const byName = exercises.get(g) ?? new Map<string, number>();
    byName.set(r.exercise.name, (byName.get(r.exercise.name) ?? 0) + r._count.sets);
    exercises.set(g, byName);
  }

  return {
    period,
    from,
    today,
    muscles: buildMuscleMap(sets, period).map((m) => ({
      ...m,
      daysSince: lastDate[m.group] ? daysBetween(lastDate[m.group]!, today) : null,
      exercises: [...(exercises.get(m.group) ?? new Map<string, number>())].map(([name, n]) => ({ name, sets: n })).sort((a, b) => b.sets - a.sets),
    })),
  };
}

export type MuscleMapData = Awaited<ReturnType<typeof getMuscleMap>>;
