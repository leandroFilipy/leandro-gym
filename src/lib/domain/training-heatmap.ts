// Quadriculado do ano: uma coluna por semana (seg → dom), cor pela quantidade de séries do dia.

import { addDays, startOfIsoWeek, type DateStr } from "../dates";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatCell {
  date: DateStr;
  sets: number;
  level: HeatLevel;
  future: boolean;
}

export interface TrainingHeatmap {
  weeks: HeatCell[][]; // cada semana tem 7 dias, segunda primeiro
  months: { col: number; month: number }[]; // coluna onde cada mês começa (month 1–12)
  trainedDays: number;
  activeWeeks: number;
  currentWeekStreak: number; // semanas seguidas com treino, terminando nesta (ou na passada)
  bestWeekStreak: number;
}

/** Limites dos níveis 2, 3 e 4 pelos quartis dos próprios dias treinados. */
export function levelThresholds(counts: number[]): [number, number, number] {
  const sorted = counts.filter((n) => n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [Infinity, Infinity, Infinity];
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

export function levelFor(sets: number, [t2, t3, t4]: [number, number, number]): HeatLevel {
  if (sets <= 0) return 0;
  if (sets >= t4) return 4;
  if (sets >= t3) return 3;
  if (sets >= t2) return 2;
  return 1;
}

export function buildTrainingHeatmap(setsByDate: Map<DateStr, number>, today: DateStr, weekCount = 53): TrainingHeatmap {
  const firstMonday = addDays(startOfIsoWeek(today), -7 * (weekCount - 1));
  const thresholds = levelThresholds([...setsByDate.entries()].filter(([d]) => d >= firstMonday && d <= today).map(([, n]) => n));

  const weeks: HeatCell[][] = [];
  const months: TrainingHeatmap["months"] = [];
  let trainedDays = 0;
  const weekActive: boolean[] = [];

  for (let w = 0; w < weekCount; w++) {
    const monday = addDays(firstMonday, 7 * w);
    const week: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const future = date > today;
      const sets = future ? 0 : (setsByDate.get(date) ?? 0);
      if (sets > 0) trainedDays++;
      week.push({ date, sets, level: levelFor(sets, thresholds), future });
    }
    // Rótulo do mês na semana em que cai o dia 1 (ou na primeira coluna).
    const firstOfMonth = week.find((c) => c.date.endsWith("-01"));
    if (firstOfMonth) months.push({ col: w, month: Number(firstOfMonth.date.slice(5, 7)) });
    else if (w === 0) months.push({ col: 0, month: Number(monday.slice(5, 7)) });
    weekActive.push(week.some((c) => c.sets > 0));
    weeks.push(week);
  }

  let best = 0;
  let run = 0;
  for (const active of weekActive) {
    run = active ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // A semana atual ainda está em andamento: se não treinou nela, a sequência vem da anterior.
  let current = 0;
  let i = weekActive.length - 1;
  if (!weekActive[i]) i--;
  while (i >= 0 && weekActive[i]) {
    current++;
    i--;
  }

  // Tira o rótulo inicial se o próximo mês começa logo em seguida (evita texto encavalado).
  if (months.length > 1 && months[1].col - months[0].col < 3) months.shift();

  return { weeks, months, trainedDays, activeWeeks: weekActive.filter(Boolean).length, currentWeekStreak: current, bestWeekStreak: best };
}
