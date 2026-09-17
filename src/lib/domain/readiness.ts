import { roundToStep, type ProgressionSuggestion } from "./progression";

// Prontidão do dia: 3 perguntas rápidas antes do treino (1–5 cada) viram uma nota 0–100
// que ajusta a sugestão de carga e, com o tempo, mostra o efeito do sono/dor/energia no treino.

export interface ReadinessAnswers {
  sleep: number; // 1 = dormi muito mal … 5 = dormi muito bem
  soreness: number; // 1 = muita dor muscular … 5 = sem dor
  energy: number; // 1 = sem energia … 5 = com muita energia
}

export type ReadinessLevel = "low" | "normal" | "high";

const WEIGHTS = { sleep: 0.4, soreness: 0.25, energy: 0.35 } as const;

const clamp15 = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

export function readinessScore(a: ReadinessAnswers): number {
  const part = (v: number) => (clamp15(v) - 1) / 4;
  return Math.round(100 * (WEIGHTS.sleep * part(a.sleep) + WEIGHTS.soreness * part(a.soreness) + WEIGHTS.energy * part(a.energy)));
}

export const LOW_READINESS = 45;
export const HIGH_READINESS = 75;

export function readinessLevel(score: number): ReadinessLevel {
  if (score < LOW_READINESS) return "low";
  if (score >= HIGH_READINESS) return "high";
  return "normal";
}

/** Corte de carga em dia ruim (−10%): menos risco e ainda estímulo suficiente. */
const LOW_DAY_FACTOR = 0.9;

/**
 * Ajusta a sugestão de progressão ao dia:
 * - baixa: não sobe carga e usa ~10% a menos que a carga de trabalho, parando com reps sobrando;
 * - alta: mantém a carga e incentiva buscar mais (é o dia de tentar recorde);
 * - normal ou sem carga de referência: sem mudança.
 */
export function adjustForReadiness(
  s: ProgressionSuggestion,
  level: ReadinessLevel,
  opts: { incrementKg: number; stepKg: number },
): ProgressionSuggestion {
  if (s.weight === null || s.weight <= 0 || level === "normal") return s;

  if (level === "low") {
    const workWeight = s.action === "increase" ? s.weight - opts.incrementKg : s.action === "decrease" ? s.weight / LOW_DAY_FACTOR : s.weight;
    const weight = Math.max(0, roundToStep(workWeight * LOW_DAY_FACTOR, opts.stepKg || 1));
    return {
      action: "decrease",
      weight,
      reps: s.reps,
      message: `Dia de recuperação: use ${formatKg(weight)} e pare com 2 reps sobrando. Se pesar, corte a última série.`,
    };
  }

  const extra = s.action === "increase" ? " Você está bem hoje — ótimo dia para subir." : " Você está bem hoje — tente uma rep a mais ou um recorde.";
  return { ...s, message: s.message + extra };
}

export interface ReadinessSample {
  score: number;
  /** Volume do treino ÷ volume do treino anterior do mesmo dia da ficha. */
  volumeRatio: number;
}

export interface ReadinessImpact {
  low: { count: number; avgChangePct: number } | null;
  good: { count: number; avgChangePct: number } | null;
  /** Diferença (pontos percentuais) entre dias bons e ruins; null com poucos dados. */
  diffPct: number | null;
}

/** Compara a evolução de volume em dias de prontidão baixa × boa (mínimo 2 treinos em cada grupo). */
export function readinessImpact(samples: readonly ReadinessSample[]): ReadinessImpact {
  const valid = samples.filter((s) => Number.isFinite(s.volumeRatio) && s.volumeRatio > 0);
  const group = (list: readonly ReadinessSample[]) =>
    list.length ? { count: list.length, avgChangePct: Math.round((list.reduce((n, s) => n + s.volumeRatio, 0) / list.length - 1) * 1000) / 10 } : null;
  const low = group(valid.filter((s) => s.score < LOW_READINESS));
  const good = group(valid.filter((s) => s.score >= LOW_READINESS));
  const diffPct = low && good && low.count >= 2 && good.count >= 2 ? Math.round((good.avgChangePct - low.avgChangePct) * 10) / 10 : null;
  return { low, good, diffPct };
}

function formatKg(n: number) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}kg`;
}
