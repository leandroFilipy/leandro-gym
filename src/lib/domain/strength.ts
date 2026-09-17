// Força relativa: 1RM estimado ÷ peso corporal, com nível por exercício.
// As faixas são aproximações de tabelas populares de padrões de força (1RM/peso corporal
// para adultos treinados) — servem como referência, não como avaliação.

export type LiftKey = "bench" | "squat" | "deadlift" | "ohp" | "row" | "curl" | "legPress" | "hipThrust";
export type StrengthSex = "MALE" | "FEMALE";

export const STRENGTH_LEVELS = ["Iniciante", "Novato", "Intermediário", "Avançado", "Elite"] as const;
export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];

/** Razão mínima (1RM/peso) para atingir Novato, Intermediário, Avançado e Elite. */
type Thresholds = readonly [number, number, number, number];

const STANDARDS: Record<LiftKey, { label: string; MALE: Thresholds; FEMALE: Thresholds }> = {
  bench: { label: "Supino reto", MALE: [0.75, 1.0, 1.5, 2.0], FEMALE: [0.5, 0.75, 1.0, 1.25] },
  squat: { label: "Agachamento livre", MALE: [1.0, 1.5, 2.0, 2.5], FEMALE: [0.75, 1.25, 1.5, 1.75] },
  deadlift: { label: "Levantamento terra", MALE: [1.25, 1.75, 2.5, 3.0], FEMALE: [1.0, 1.25, 1.75, 2.25] },
  ohp: { label: "Desenvolvimento com barra", MALE: [0.5, 0.75, 1.0, 1.25], FEMALE: [0.35, 0.5, 0.75, 0.9] },
  row: { label: "Remada curvada", MALE: [0.65, 0.9, 1.2, 1.5], FEMALE: [0.4, 0.65, 0.9, 1.15] },
  curl: { label: "Rosca direta", MALE: [0.4, 0.6, 0.85, 1.1], FEMALE: [0.2, 0.4, 0.6, 0.8] },
  legPress: { label: "Leg press", MALE: [1.75, 2.5, 3.5, 4.5], FEMALE: [1.25, 2.0, 2.75, 3.5] },
  hipThrust: { label: "Elevação pélvica", MALE: [1.0, 1.5, 2.25, 3.0], FEMALE: [1.0, 1.5, 2.0, 2.5] },
};

const RULES: { key: LiftKey; match: RegExp; exclude?: RegExp }[] = [
  { key: "bench", match: /supino|bench press/, exclude: /inclinad|declinad|halter|maquina|articulad|fechad|smith|crucifixo/ },
  { key: "squat", match: /agachamento|squat/, exclude: /bulgaro|sumo|goblet|hack|smith|afundo|halter|frontal|maquina|sissy/ },
  { key: "deadlift", match: /terra|deadlift/, exclude: /romeno|stiff|sumo|halter/ },
  { key: "ohp", match: /desenvolvimento|militar|overhead press/, exclude: /halter|maquina|arnold|smith|articulad/ },
  { key: "row", match: /remada curvada|barbell row|pendlay/, exclude: /halter|unilateral/ },
  { key: "curl", match: /rosca direta|barbell curl/, exclude: /halter|polia|cabo|alternad|martelo/ },
  { key: "legPress", match: /leg press|leg 45/ },
  { key: "hipThrust", match: /elevacao pelvica|hip thrust/, exclude: /unilateral|maquina/ },
];

function normalize(name: string) {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Identifica um levantamento com padrão conhecido pelo nome do exercício. */
export function liftKeyFor(exerciseName: string): LiftKey | null {
  const n = normalize(exerciseName);
  return RULES.find((r) => r.match.test(n) && !r.exclude?.test(n))?.key ?? null;
}

export interface RelativeStrength {
  ratio: number; // 1RM estimado / peso corporal
  lift: { key: LiftKey; label: string } | null;
  level: StrengthLevel | null;
  /** Progresso (0–1) dentro do nível atual até o próximo; null em Elite ou sem padrão. */
  progress: number | null;
  /** Carga de 1RM necessária para o próximo nível (kg). */
  nextLevel: { level: StrengthLevel; oneRm: number } | null;
}

export function relativeStrength(
  exerciseName: string,
  oneRm: number,
  bodyWeightKg: number,
  sex: StrengthSex | null,
): RelativeStrength | null {
  if (oneRm <= 0 || bodyWeightKg <= 0) return null;
  const ratio = oneRm / bodyWeightKg;
  const key = liftKeyFor(exerciseName);
  if (!key) return { ratio, lift: null, level: null, progress: null, nextLevel: null };

  const std = STANDARDS[key];
  const lift = { key, label: std.label };
  // Sem sexo informado, usa a tabela masculina (padrão mais comum no app) — o perfil permite ajustar.
  const t = std[sex ?? "MALE"];
  const idx = t.filter((min) => ratio >= min).length; // 0 = Iniciante … 4 = Elite
  const level = STRENGTH_LEVELS[idx];
  if (idx === t.length) return { ratio, lift, level, progress: null, nextLevel: null };

  const floor = idx === 0 ? 0 : t[idx - 1];
  const ceil = t[idx];
  return {
    ratio,
    lift,
    level,
    progress: Math.min(1, Math.max(0, (ratio - floor) / (ceil - floor))),
    nextLevel: { level: STRENGTH_LEVELS[idx + 1], oneRm: Math.ceil(ceil * bodyWeightKg) },
  };
}
