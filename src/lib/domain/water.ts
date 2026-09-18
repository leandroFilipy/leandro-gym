// Hidratação: meta diária (35 ml por kg, ou valor manual) e se o dia está "atrasado" a certa hora.

export const DEFAULT_WATER_GOAL_ML = 2500;
const ML_PER_KG = 35;
const MIN_GOAL = 1500;
const MAX_GOAL = 6000;

/** Meta manual vence; senão 35 ml/kg arredondado a 50 ml; sem peso, 2,5 L. */
export function waterGoalMl(weightKg: number | null | undefined, manualMl: number | null | undefined): number {
  if (manualMl && manualMl > 0) return manualMl;
  if (!weightKg || weightKg <= 0) return DEFAULT_WATER_GOAL_ML;
  return Math.min(MAX_GOAL, Math.max(MIN_GOAL, Math.round((weightKg * ML_PER_KG) / 50) * 50));
}

/** Janela em que se espera beber a meta (7h → 22h, distribuída por igual). */
const DAY_START = 7;
const DAY_END = 22;

/** Quanto já deveria ter sido bebido até a hora local informada. */
export function expectedWaterByHour(goalMl: number, hour: number): number {
  const fraction = Math.min(1, Math.max(0, (hour - DAY_START) / (DAY_END - DAY_START)));
  return Math.round(goalMl * fraction);
}

/** Atrasado = abaixo de 60% do esperado para a hora (tolerância para não virar chatice). */
export function isWaterBehind(drankMl: number, goalMl: number, hour: number): boolean {
  const expected = expectedWaterByHour(goalMl, hour);
  return expected > 0 && drankMl < expected * 0.6;
}
