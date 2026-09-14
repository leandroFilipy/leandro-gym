import { addDays, type DateStr } from "../dates";
import type { DatedValue } from "./types";

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Média dos registros no intervalo [from, to] (inclusive). */
export function averageBetween(entries: readonly DatedValue[], from: DateStr, to: DateStr): number | null {
  return mean(entries.filter((e) => e.date >= from && e.date <= to).map((e) => e.value));
}

/** Média móvel de N dias para cada registro (usa os registros existentes na janela). */
export function movingAverage(entries: readonly DatedValue[], windowDays = 7): DatedValue[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((e) => ({
    date: e.date,
    value: averageBetween(sorted, addDays(e.date, -(windowDays - 1)), e.date) ?? e.value,
  }));
}

export interface WeeklyWeightComparison {
  currentAvg: number | null; // últimos 7 dias (inclui hoje)
  previousAvg: number | null; // 7 dias anteriores
  change: number | null;
}

export function weeklyComparison(entries: readonly DatedValue[], today: DateStr): WeeklyWeightComparison {
  const currentAvg = averageBetween(entries, addDays(today, -6), today);
  const previousAvg = averageBetween(entries, addDays(today, -13), addDays(today, -7));
  const change = currentAvg !== null && previousAvg !== null ? currentAvg - previousAvg : null;
  return { currentAvg, previousAvg, change };
}
