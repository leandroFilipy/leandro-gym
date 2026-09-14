import { estimate1RM } from "./volume";

export interface RecordCandidate {
  weight: number;
  repetitions: number;
}

/**
 * É recorde se o 1RM estimado supera o melhor anterior.
 * Sem histórico anterior (primeira vez no exercício) não conta como recorde.
 */
export function isNewRecord(candidate: RecordCandidate, previousBest1RM: number | null): boolean {
  if (previousBest1RM === null || previousBest1RM <= 0) return false;
  return estimate1RM(candidate.weight, candidate.repetitions) > previousBest1RM + 1e-9;
}
