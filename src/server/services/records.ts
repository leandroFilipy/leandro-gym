import "server-only";
import { db } from "../db";
import { estimate1RM } from "@/lib/domain/volume";
import { isNewRecord } from "@/lib/domain/records";

/** Melhor 1RM estimado já registrado de um exercício, ignorando uma série específica. */
async function previousBest(userId: string, exerciseId: string, excludeSetId: string) {
  const sets = await db.exerciseSet.findMany({
    where: {
      id: { not: excludeSetId },
      completed: true,
      workoutExercise: { exerciseId, session: { userId } },
    },
    select: { weight: true, repetitions: true },
  });
  let best: { weight: number; repetitions: number; e1rm: number } | null = null;
  for (const s of sets) {
    const e1rm = estimate1RM(s.weight, s.repetitions);
    if (!best || e1rm > best.e1rm) best = { ...s, e1rm };
  }
  return best;
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
  const sets = await db.exerciseSet.findMany({
    where: { completed: true, workoutExercise: { session: { userId } } },
    select: {
      weight: true,
      repetitions: true,
      workoutExercise: {
        select: { exerciseId: true, exercise: { select: { name: true, muscleGroup: true } }, session: { select: { date: true } } },
      },
    },
  });
  const best = new Map<string, { exerciseId: string; name: string; weight: number; repetitions: number; e1rm: number; date: Date }>();
  for (const s of sets) {
    const e1rm = estimate1RM(s.weight, s.repetitions);
    const key = s.workoutExercise.exerciseId;
    const cur = best.get(key);
    if (!cur || e1rm > cur.e1rm) {
      best.set(key, {
        exerciseId: key,
        name: s.workoutExercise.exercise.name,
        weight: s.weight,
        repetitions: s.repetitions,
        e1rm,
        date: s.workoutExercise.session.date,
      });
    }
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
 * que já têm série registrada. Usado na tela de detalhes do treino.
 */
export async function bestSetsForExercises(userId: string, exerciseIds: string[]) {
  const map = new Map<string, { weight: number; repetitions: number; e1rm: number; date: Date }>();
  if (exerciseIds.length === 0) return map;

  const sets = await db.exerciseSet.findMany({
    where: {
      completed: true,
      workoutExercise: { exerciseId: { in: exerciseIds }, session: { userId } },
    },
    select: {
      weight: true,
      repetitions: true,
      workoutExercise: { select: { exerciseId: true, session: { select: { date: true } } } },
    },
  });

  for (const s of sets) {
    const key = s.workoutExercise.exerciseId;
    const e1rm = estimate1RM(s.weight, s.repetitions);
    const cur = map.get(key);
    if (!cur || e1rm > cur.e1rm) {
      map.set(key, { weight: s.weight, repetitions: s.repetitions, e1rm, date: s.workoutExercise.session.date });
    }
  }
  return map;
}
