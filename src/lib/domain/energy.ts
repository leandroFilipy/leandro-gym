import { daysBetween } from "../dates";
import type { DatedValue } from "./types";

/** kcal aproximadas por kg de variação de peso corporal. */
export const KCAL_PER_KG = 7700;

export interface EnergyBalance {
  avgIntake: number | null;
  daysLogged: number;
  dailyBalance: number | null; // positivo = superávit, negativo = déficit
  weeklyBalance: number | null;
}

/** Balanço estimado = consumo médio (só dias com registro) − TDEE informado. */
export function energyBalance(tdee: number | null, dailyIntakes: readonly DatedValue[]): EnergyBalance {
  const logged = dailyIntakes.filter((d) => d.value > 0);
  const avgIntake = logged.length ? logged.reduce((s, d) => s + d.value, 0) / logged.length : null;
  const dailyBalance = tdee && avgIntake !== null ? avgIntake - tdee : null;
  return {
    avgIntake,
    daysLogged: logged.length,
    dailyBalance,
    weeklyBalance: dailyBalance !== null ? dailyBalance * 7 : null,
  };
}

export interface AdaptiveTdee {
  tdee: number;
  avgIntake: number;
  weightTrendKgPerWeek: number;
  days: number;
}

/**
 * TDEE adaptativo (fase 3): gasto ≈ consumo médio − (variação de peso × 7700 / dias).
 * Usa a inclinação (regressão linear) do peso para reduzir ruído diário.
 * Retorna null se houver menos de `minDays` de dados.
 */
export function estimateAdaptiveTdee(
  weights: readonly DatedValue[],
  intakes: readonly DatedValue[],
  minDays = 14,
): AdaptiveTdee | null {
  const loggedIntakes = intakes.filter((d) => d.value > 0);
  if (weights.length < 7 || loggedIntakes.length < minDays * 0.7) return null;

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  const span = daysBetween(sorted[0].date, sorted[sorted.length - 1].date);
  if (span < minDays) return null;

  const xs = sorted.map((w) => daysBetween(sorted[0].date, w.date));
  const ys = sorted.map((w) => w.value);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slopePerDay = den ? num / den : 0;

  const avgIntake = loggedIntakes.reduce((s, d) => s + d.value, 0) / loggedIntakes.length;
  return {
    tdee: avgIntake - slopePerDay * KCAL_PER_KG,
    avgIntake,
    weightTrendKgPerWeek: slopePerDay * 7,
    days: span,
  };
}
