import type { MuscleGroup } from "@/generated/prisma/enums";

export interface VolumeTarget {
  min: number;
  max: number;
}

/**
 * Faixa de séries semanais por grupo (referência: 10–20 séries diretas/semana para
 * hipertrofia em músculos grandes; músculos pequenos recebem trabalho indireto, então
 * a faixa é menor). Grupos sem alvo (cardio, corpo todo, outro) não entram na análise.
 */
export const VOLUME_TARGETS: Partial<Record<MuscleGroup, VolumeTarget>> = {
  CHEST: { min: 10, max: 20 },
  BACK: { min: 10, max: 20 },
  SHOULDERS: { min: 8, max: 18 },
  QUADS: { min: 10, max: 20 },
  HAMSTRINGS: { min: 8, max: 16 },
  GLUTES: { min: 6, max: 16 },
  BICEPS: { min: 6, max: 14 },
  TRICEPS: { min: 6, max: 14 },
  CALVES: { min: 6, max: 14 },
  ABS: { min: 6, max: 14 },
  FOREARMS: { min: 4, max: 10 },
};

export type VolumeStatus = "below" | "within" | "above";

export interface MuscleVolumeRow {
  group: MuscleGroup;
  done: number; // séries concluídas na semana
  planned: number; // séries planejadas na ficha ativa (semana inteira)
  target: VolumeTarget;
  status: VolumeStatus; // status do que foi FEITO
  plannedStatus: VolumeStatus; // status do que a ficha prevê
}

export function volumeStatus(sets: number, target: VolumeTarget): VolumeStatus {
  if (sets < target.min) return "below";
  if (sets > target.max) return "above";
  return "within";
}

/**
 * Cruza séries feitas e planejadas com as faixas-alvo.
 * Só lista grupos com alvo que aparecem na ficha ou foram treinados.
 * Ordena: abaixo da faixa primeiro, depois dentro, depois acima; em empate, mais séries.
 */
export function analyzeMuscleVolume(
  done: Partial<Record<MuscleGroup, number>>,
  planned: Partial<Record<MuscleGroup, number>>,
): MuscleVolumeRow[] {
  const order: Record<VolumeStatus, number> = { below: 0, above: 1, within: 2 };
  return (Object.entries(VOLUME_TARGETS) as [MuscleGroup, VolumeTarget][])
    .map(([group, target]) => {
      const d = done[group] ?? 0;
      const p = planned[group] ?? 0;
      return { group, done: d, planned: p, target, status: volumeStatus(d, target), plannedStatus: volumeStatus(p, target) };
    })
    .filter((r) => r.done > 0 || r.planned > 0)
    .sort((a, b) => order[a.plannedStatus] - order[b.plannedStatus] || b.planned - a.planned || b.done - a.done);
}
