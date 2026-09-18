// Grupos musculares esquecidos: estão na ficha, mas não recebem série há muitos dias.

import type { MuscleGroup } from "@/generated/prisma/enums";
import { daysBetween, type DateStr } from "../dates";
import { VOLUME_TARGETS } from "./muscle-volume";

export const FORGOTTEN_AFTER_DAYS = 10;

export interface ForgottenMuscle {
  group: MuscleGroup;
  /** Dias desde a última série; null = nenhuma série na janela analisada. */
  days: number | null;
  /** Dias da ficha que treinam o grupo (para sugerir quando fazer). */
  dayNames: string[];
}

export function forgottenMuscles(input: {
  planned: { group: MuscleGroup; dayName: string }[];
  lastTrained: Partial<Record<MuscleGroup, DateStr>>;
  today: DateStr;
  /** Só avisa quem está treinando: sem treino recente, o problema não é o músculo. */
  trainedRecently: boolean;
  thresholdDays?: number;
}): ForgottenMuscle[] {
  if (!input.trainedRecently) return [];
  const threshold = input.thresholdDays ?? FORGOTTEN_AFTER_DAYS;

  const byGroup = new Map<MuscleGroup, string[]>();
  for (const p of input.planned) {
    if (!VOLUME_TARGETS[p.group]) continue; // cardio, corpo todo, outro
    const names = byGroup.get(p.group) ?? [];
    if (!names.includes(p.dayName)) names.push(p.dayName);
    byGroup.set(p.group, names);
  }

  const out: ForgottenMuscle[] = [];
  for (const [group, dayNames] of byGroup) {
    const last = input.lastTrained[group];
    const days = last ? daysBetween(last, input.today) : null;
    if (days === null || days >= threshold) out.push({ group, days, dayNames });
  }
  // Nunca treinado primeiro, depois o mais antigo.
  return out.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
}
