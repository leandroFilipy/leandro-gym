import "server-only";
import { db } from "../db";
import { Prisma } from "@/generated/prisma/client";
import type { MuscleGroup } from "@/generated/prisma/enums";
import { estimate1RM } from "@/lib/domain/volume";
import { isNewRecord } from "@/lib/domain/records";

// O melhor 1RM estimado por exercício é calculado no banco (DISTINCT ON), sem carregar todas as
// séries do histórico na memória. A expressão replica `estimate1RM` (Epley; 1 rep = a carga).
const E1RM_SQL = Prisma.sql`CASE WHEN s."repetitions" <= 0 OR s."weight" <= 0 THEN 0
  WHEN s."repetitions" = 1 THEN s."weight"
  ELSE s."weight" * (1 + s."repetitions" / 30.0) END`;

interface BestSetRow {
  exerciseId: string;
  setId: string;
  name: string;
  muscleGroup: MuscleGroup;
  weight: number;
  repetitions: number;
  e1rm: number;
  date: Date;
}

/** Melhor série (maior 1RM estimado) de cada exercício do usuário, com filtros opcionais. */
async function bestSets(
  userId: string,
  opts: { exerciseIds?: string[]; excludeSetId?: string; before?: Date } = {},
): Promise<BestSetRow[]> {
  if (opts.exerciseIds && opts.exerciseIds.length === 0) return [];
  const filters = [
    opts.exerciseIds ? Prisma.sql`AND we."exerciseId" IN (${Prisma.join(opts.exerciseIds)})` : Prisma.empty,
    opts.excludeSetId ? Prisma.sql`AND s."id" <> ${opts.excludeSetId}` : Prisma.empty,
    opts.before ? Prisma.sql`AND ws."date" < ${opts.before}` : Prisma.empty,
  ];
  const rows = await db.$queryRaw<BestSetRow[]>`
    SELECT DISTINCT ON (we."exerciseId")
      we."exerciseId" AS "exerciseId", s."id" AS "setId", e."name", e."muscleGroup",
      s."weight", s."repetitions", (${E1RM_SQL})::float8 AS "e1rm", ws."date"
    FROM "ExerciseSet" s
    JOIN "WorkoutExercise" we ON we."id" = s."workoutExerciseId"
    JOIN "WorkoutSession" ws ON ws."id" = we."sessionId"
    JOIN "Exercise" e ON e."id" = we."exerciseId"
    WHERE ws."userId" = ${userId} AND s."completed" = true
      ${Prisma.join(filters, " ")}
    ORDER BY we."exerciseId", "e1rm" DESC, ws."date" ASC`;
  return rows.map((r) => ({ ...r, weight: Number(r.weight), repetitions: Number(r.repetitions), e1rm: Number(r.e1rm) }));
}

/** Melhor 1RM estimado já registrado de um exercício, ignorando uma série específica. */
async function previousBest(userId: string, exerciseId: string, excludeSetId: string) {
  const [row] = await bestSets(userId, { exerciseIds: [exerciseId], excludeSetId });
  return row ? { weight: row.weight, repetitions: row.repetitions, e1rm: row.e1rm } : null;
}

/**
 * Verifica se a série é recorde e mantém a tabela PersonalRecord consistente
 * (uma série editada que deixou de ser recorde perde o registro).
 */
export async function evaluateRecord(userId: string, exerciseId: string, set: { id: string; weight: number; repetitions: number }) {
  const prev = await previousBest(userId, exerciseId, set.id);
  if (!isNewRecord(set, prev?.e1rm ?? null)) {
    await db.personalRecord.deleteMany({ where: { setId: set.id, userId } });
    return null;
  }
  const e1rm = estimate1RM(set.weight, set.repetitions);
  await db.personalRecord.upsert({
    where: { setId: set.id },
    create: { userId, exerciseId, setId: set.id, weight: set.weight, repetitions: set.repetitions, estimated1RM: e1rm },
    update: { weight: set.weight, repetitions: set.repetitions, estimated1RM: e1rm },
  });
  return { weight: set.weight, repetitions: set.repetitions, previous: prev ? { weight: prev.weight, repetitions: prev.repetitions } : null };
}

/** Melhor série de cada exercício (para a área de recordes). */
export async function listBestPerExercise(userId: string) {
  const rows = await bestSets(userId);
  return rows
    .map((r) => ({ exerciseId: r.exerciseId, name: r.name, weight: r.weight, repetitions: r.repetitions, e1rm: r.e1rm, date: r.date }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function listRecentRecords(userId: string, take = 5) {
  return db.personalRecord.findMany({
    where: { userId },
    orderBy: { achievedAt: "desc" },
    take,
    include: { exercise: { select: { name: true } } },
  });
}

/**
 * Recorde (melhor série por 1RM estimado) de cada exercício informado.
 * Retorna um mapa exerciseId → { weight, repetitions, e1rm, date } para os exercícios
 * que já têm série registrada. Opcionalmente só com séries de antes de uma data.
 */
export async function bestSetsForExercises(userId: string, exerciseIds: string[], before?: Date) {
  const rows = await bestSets(userId, { exerciseIds, before });
  return new Map(rows.map((r) => [r.exerciseId, { weight: r.weight, repetitions: r.repetitions, e1rm: r.e1rm, date: r.date }]));
}
