import type { SetLike } from "./types";

export type ProgressionAction = "increase" | "maintain" | "decrease" | "none";

export interface ProgressionInput {
  lastSets: readonly SetLike[]; // séries do último treino desse exercício
  plannedSets: number;
  repMin: number;
  repMax: number;
  incrementKg: number;
  stepKg: number;
}

export interface ProgressionSuggestion {
  action: ProgressionAction;
  weight: number | null; // carga sugerida para a 1ª série
  reps: number; // reps alvo
  message: string;
}

export function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.round(value / step) * step;
}

/**
 * Regra simples (sem IA):
 * - Bateu o topo da faixa em todas as séries planejadas → aumenta a carga.
 * - Média muito abaixo do mínimo (repMin − 2) → reduz ~10%.
 * - Caso contrário → mantém e busca mais repetições.
 */
export function suggestProgression(input: ProgressionInput): ProgressionSuggestion {
  const sets = input.lastSets.filter((s) => s.completed !== false && s.repetitions > 0);
  if (sets.length === 0) {
    return { action: "none", weight: null, reps: input.repMax, message: "Primeira vez: escolha uma carga confortável." };
  }

  // Carga de referência = a mais usada (moda); em empate, a maior.
  const counts = new Map<number, number>();
  for (const s of sets) counts.set(s.weight, (counts.get(s.weight) ?? 0) + 1);
  const workWeight = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  const workSets = sets.filter((s) => s.weight === workWeight);

  const hitTop = sets.length >= input.plannedSets && workSets.every((s) => s.repetitions >= input.repMax);
  if (hitTop && workWeight > 0) {
    const next = workWeight + input.incrementKg;
    return {
      action: "increase",
      weight: next,
      reps: input.repMin,
      message: `Bateu ${input.repMax} reps em todas as séries. Suba para ${formatKg(next)}.`,
    };
  }

  const avgReps = workSets.reduce((s, x) => s + x.repetitions, 0) / workSets.length;
  if (avgReps < input.repMin - 2 && workWeight > 0) {
    const next = Math.max(0, roundToStep(workWeight * 0.9, input.stepKg || 1));
    if (next < workWeight) {
      return {
        action: "decrease",
        weight: next,
        reps: input.repMin,
        message: `Reps abaixo da faixa. Reduza para ${formatKg(next)} e foque na execução.`,
      };
    }
  }

  const best = Math.max(...workSets.map((s) => s.repetitions));
  const target = Math.min(input.repMax, best + 1);
  return {
    action: "maintain",
    weight: workWeight,
    reps: Math.max(input.repMin, target),
    message: `Mantenha ${formatKg(workWeight)} e tente ${Math.max(input.repMin, target)} reps.`,
  };
}

function formatKg(n: number) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}kg`;
}
