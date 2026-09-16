export const MEASUREMENT_FIELDS = ["waist", "hip", "chest", "arm", "thigh", "calf", "neck", "bodyFat"] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

export type MeasurementValues = Partial<Record<MeasurementField, number | null>>;

export interface MeasurementEntry extends MeasurementValues {
  date: string; // YYYY-MM-DD
}

export interface MeasurementDelta {
  field: MeasurementField;
  latest: number;
  latestDate: string;
  first: number;
  firstDate: string;
  change: number; // latest − first
  previous: number | null;
  sincePrevious: number | null; // latest − registro anterior do mesmo campo
}

/**
 * Para cada medida: último valor, variação desde o primeiro registro e desde o anterior.
 * Cada campo é tratado independentemente (nem todo dia mede tudo).
 */
export function measurementDeltas(entries: readonly MeasurementEntry[]): MeasurementDelta[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const out: MeasurementDelta[] = [];
  for (const field of MEASUREMENT_FIELDS) {
    const points = sorted.filter((e) => typeof e[field] === "number").map((e) => ({ date: e.date, value: e[field] as number }));
    if (points.length === 0) continue;
    const first = points[0];
    const latest = points.at(-1)!;
    const prev = points.length > 1 ? points.at(-2)! : null;
    out.push({
      field,
      latest: latest.value,
      latestDate: latest.date,
      first: first.value,
      firstDate: first.date,
      change: round1(latest.value - first.value),
      previous: prev?.value ?? null,
      sincePrevious: prev ? round1(latest.value - prev.value) : null,
    });
  }
  return out;
}

/** Relação cintura/quadril (risco cardiometabólico). null sem as duas medidas. */
export function waistToHip(v: MeasurementValues): number | null {
  if (!v.waist || !v.hip) return null;
  return Math.round((v.waist / v.hip) * 100) / 100;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
