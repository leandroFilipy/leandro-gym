import { roundToStep } from "./progression";
import { bestSet, estimate1RM } from "./volume";
import type { SetLike } from "./types";

export type StagnationStatus = "insufficient" | "progressing" | "stalled" | "regressing";

export interface ExerciseSessionLike {
  date: string; // YYYY-MM-DD
  sets: readonly (SetLike & { rir?: number | null })[];
}

export interface StagnationTip {
  kind: "deload" | "reps" | "variation" | "recovery";
  title: string;
  text: string;
}

export interface StagnationResult {
  status: StagnationStatus;
  sessionsSinceImprovement: number;
  bestE1RM: number;
  lastE1RM: number;
  bestDate: string | null;
  deloadWeight: number | null;
  message: string;
  tips: StagnationTip[];
}

export interface StagnationOptions {
  /** Sessões seguidas sem melhora para considerar estagnado (padrão 3). */
  threshold?: number;
  /** Melhora mínima relativa do 1RM estimado para contar como progresso (padrão 0,5%). */
  minGain?: number;
  stepKg?: number;
  repMin?: number;
  repMax?: number;
}

const MIN_SESSIONS = 4;

/**
 * Detecta platô de um exercício a partir das sessões (qualquer ordem).
 * Métrica: melhor 1RM estimado (Epley) de cada sessão. Conta quantas sessões se passaram
 * desde o último recorde "de verdade" (ganho ≥ minGain). ≥ threshold → estagnado;
 * se além disso as últimas sessões estão ≥ 5% abaixo do melhor → regredindo.
 */
export function detectStagnation(sessions: readonly ExerciseSessionLike[], opts: StagnationOptions = {}): StagnationResult {
  const threshold = opts.threshold ?? 3;
  const minGain = opts.minGain ?? 0.005;

  const points = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => {
      const best = bestSet(s.sets.filter((x) => x.completed !== false && x.repetitions > 0 && x.weight > 0));
      return { date: s.date, sets: s.sets, best, e1rm: best ? estimate1RM(best.weight, best.repetitions) : 0 };
    })
    .filter((p) => p.e1rm > 0);

  const empty: StagnationResult = {
    status: "insufficient",
    sessionsSinceImprovement: 0,
    bestE1RM: 0,
    lastE1RM: 0,
    bestDate: null,
    deloadWeight: null,
    message: "Poucos treinos para avaliar a evolução.",
    tips: [],
  };
  if (points.length < MIN_SESSIONS) return { ...empty, bestE1RM: maxOf(points), lastE1RM: points.at(-1)?.e1rm ?? 0 };

  let best = points[0].e1rm;
  let bestDate = points[0].date;
  let since = 0;
  for (const p of points.slice(1)) {
    if (p.e1rm > best * (1 + minGain)) {
      best = p.e1rm;
      bestDate = p.date;
      since = 0;
    } else {
      since++;
      if (p.e1rm > best) best = p.e1rm; // melhora mínima: atualiza o topo sem zerar o contador
    }
  }

  const last = points.at(-1)!;
  const recent = points.slice(-Math.min(threshold, points.length));
  const recentAvg = recent.reduce((n, p) => n + p.e1rm, 0) / recent.length;
  const base = { sessionsSinceImprovement: since, bestE1RM: best, lastE1RM: last.e1rm, bestDate };

  if (since < threshold) {
    return { ...base, status: "progressing", deloadWeight: null, message: "Evoluindo bem.", tips: [] };
  }

  const regressing = recentAvg < best * 0.95;
  const workWeight = last.best?.weight ?? 0;
  const deloadWeight = workWeight > 0 ? Math.max(0, roundToStep(workWeight * 0.9, opts.stepKg || 1)) : null;
  const rirs = recent.flatMap((p) => p.sets.map((s) => s.rir)).filter((r): r is number => typeof r === "number");
  const nearFailure = rirs.length > 0 && rirs.reduce((n, r) => n + r, 0) / rirs.length <= 1;

  const tips: StagnationTip[] = [];
  if (deloadWeight !== null) {
    tips.push({
      kind: "deload",
      title: "Deload de 1 semana",
      text:
        `Use ~${fmtKg(deloadWeight)} (−10%) com as mesmas reps, longe da falha. Na semana seguinte volte à carga normal.` +
        (nearFailure ? " Suas séries recentes estão perto da falha (RIR ≤ 1): fadiga acumulada é provável." : ""),
    });
  }
  tips.push(repRangeTip(opts.repMin, opts.repMax));
  if (since >= threshold + 2) {
    tips.push({
      kind: "variation",
      title: "Troque a variação",
      text: "Faça 4–6 semanas de uma variação próxima (ex.: halter no lugar da barra, inclinado no lugar do reto) e depois volte.",
    });
  }
  if (regressing) {
    tips.push({
      kind: "recovery",
      title: "Confira a recuperação",
      text: "Queda de força costuma vir de sono curto, déficit calórico grande ou pouca proteína. Vale olhar a dieta da semana.",
    });
  }

  return {
    ...base,
    status: regressing ? "regressing" : "stalled",
    deloadWeight,
    message: regressing
      ? `Força caindo: ${since} treinos abaixo do seu melhor.`
      : `Sem progresso há ${since} treinos.`,
    tips,
  };
}

function repRangeTip(repMin?: number, repMax?: number): StagnationTip {
  const heavy = repMax !== undefined && repMax <= 8;
  const next = heavy ? "10–12" : "5–8";
  const current = repMin !== undefined && repMax !== undefined ? ` (hoje ${repMin}–${repMax})` : "";
  return {
    kind: "reps",
    title: "Mude a faixa de repetições",
    text: `Troque a faixa${current} para ${next} reps por algumas semanas: estímulo novo, mesma articulação.`,
  };
}

function maxOf(points: { e1rm: number }[]) {
  return points.reduce((n, p) => Math.max(n, p.e1rm), 0);
}

function fmtKg(n: number) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}kg`;
}
