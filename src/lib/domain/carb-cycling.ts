// Meta diferente em dia de treino e de descanso ("ciclo de carboidrato").
// No descanso tira X g de carboidrato; nos dias de treino devolve o mesmo total dividido entre
// eles — a média da semana continua igual à meta configurada.

import type { Macros } from "./types";

export type DayKind = "training" | "rest";

export interface CarbCycle {
  restDayCarbsCut: number; // g a menos no dia de descanso
  trainingDays: number; // dias de treino por semana na ficha ativa
  restDays: number;
}

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

export function goalForDay(goal: Macros, kind: DayKind, cycle: CarbCycle): Macros {
  const { restDayCarbsCut, trainingDays, restDays } = cycle;
  if (restDayCarbsCut <= 0 || trainingDays === 0 || restDays === 0) return goal;

  const cut = Math.min(restDayCarbsCut, goal.carbs);
  const delta = kind === "rest" ? -cut : roundTo5((cut * restDays) / trainingDays);
  return {
    kcal: Math.round(goal.kcal + delta * 4),
    protein: goal.protein,
    carbs: Math.max(0, goal.carbs + delta),
    fat: goal.fat,
  };
}
