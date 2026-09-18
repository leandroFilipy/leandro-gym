// Mapa muscular: nível de cada grupo no período, comparando com a faixa semanal de séries.

import type { MuscleGroup } from "@/generated/prisma/enums";
import { VOLUME_TARGETS } from "./muscle-volume";

export type MapPeriod = "hoje" | "semana" | "30d";
/** 0 = não treinou · 1 = abaixo da faixa · 2 = dentro · 3 = acima. */
export type MapLevel = 0 | 1 | 2 | 3;

export const MAP_PERIOD_DAYS: Record<MapPeriod, number> = { hoje: 1, semana: 7, "30d": 30 };

/** Grupos desenhados no boneco (os que têm faixa-alvo). */
export const MAP_GROUPS = Object.keys(VOLUME_TARGETS) as MuscleGroup[];

export interface MuscleMapEntry {
  group: MuscleGroup;
  sets: number;
  level: MapLevel;
  /** Faixa proporcional ao período (ex.: 30 dias ≈ 4,3 semanas). null em "hoje". */
  target: { min: number; max: number } | null;
}

/**
 * "hoje": qualquer série já ativa; 1–3 séries = leve, 4–9 = bom, 10+ = muito.
 * semana/30d: compara com a faixa semanal escalada pelo tamanho do período.
 */
export function muscleLevel(sets: number, group: MuscleGroup, period: MapPeriod): { level: MapLevel; target: MuscleMapEntry["target"] } {
  if (period === "hoje") return { level: sets <= 0 ? 0 : sets < 4 ? 1 : sets < 10 ? 2 : 3, target: null };
  const base = VOLUME_TARGETS[group];
  if (!base) return { level: sets > 0 ? 2 : 0, target: null };
  const weeks = MAP_PERIOD_DAYS[period] / 7;
  const target = { min: Math.round(base.min * weeks), max: Math.round(base.max * weeks) };
  const level: MapLevel = sets <= 0 ? 0 : sets < target.min ? 1 : sets <= target.max ? 2 : 3;
  return { level, target };
}

export function buildMuscleMap(setsByGroup: Partial<Record<MuscleGroup, number>>, period: MapPeriod): MuscleMapEntry[] {
  return MAP_GROUPS.map((group) => {
    const sets = setsByGroup[group] ?? 0;
    return { group, sets, ...muscleLevel(sets, group, period) };
  });
}
