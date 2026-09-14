import type { SetLike } from "./types";

const done = (s: SetLike) => s.completed !== false;

/** Volume = Σ carga × repetições das séries concluídas. */
export function totalVolume(sets: readonly SetLike[]): number {
  return sets.filter(done).reduce((sum, s) => sum + s.weight * s.repetitions, 0);
}

/** Variação percentual de `previous` para `current`. null se não houver base. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Melhor série = maior 1RM estimado. */
export function bestSet<T extends SetLike>(sets: readonly T[]): T | null {
  let best: T | null = null;
  for (const s of sets.filter(done)) {
    if (!best || estimate1RM(s.weight, s.repetitions) > estimate1RM(best.weight, best.repetitions)) best = s;
  }
  return best;
}

/** Fórmula de Epley. Para 1 rep, é a própria carga. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
