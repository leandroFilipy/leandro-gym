import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, fromDbDate, startOfIsoWeek, todayIn, toDbDate } from "@/lib/dates";
import { buildTrainingHeatmap } from "@/lib/domain/training-heatmap";

const WEEKS = 53;

/** Séries feitas por dia no último ano (somado no banco) → quadriculado de frequência. */
export async function getTrainingHeatmap(userId: string) {
  const settings = await getSettings(userId);
  const today = todayIn(settings.timezone);
  const from = addDays(startOfIsoWeek(today), -7 * (WEEKS - 1));

  // Dia conta se teve série feita ou treino finalizado (ex.: cardio sem séries → 1).
  const rows = await db.$queryRaw<{ date: Date; sets: number }[]>`
    SELECT ws."date", GREATEST(COUNT(s."id") FILTER (WHERE s."completed"), 1)::int AS "sets"
    FROM "WorkoutSession" ws
    LEFT JOIN "WorkoutExercise" we ON we."sessionId" = ws."id"
    LEFT JOIN "ExerciseSet" s ON s."workoutExerciseId" = we."id"
    WHERE ws."userId" = ${userId} AND ws."date" >= ${toDbDate(from)}
    GROUP BY ws."date"
    HAVING COUNT(s."id") FILTER (WHERE s."completed") > 0 OR BOOL_OR(ws."finishedAt" IS NOT NULL)
  `;

  return buildTrainingHeatmap(new Map(rows.map((r) => [fromDbDate(r.date), r.sets])), today, WEEKS);
}
