import { fmtNumber } from "@/lib/format";

interface S {
  weight: number;
  repetitions: number;
}

export const fmtSet = (s: S) => `${fmtNumber(s.weight)}kg × ${s.repetitions}`;

/** "30kg — 10 / 9 / 8" quando a carga é igual; senão "30×10 · 32×8". */
export function fmtSetsCompact(sets: readonly S[]): string {
  if (sets.length === 0) return "—";
  const sameWeight = sets.every((s) => s.weight === sets[0].weight);
  if (sameWeight) return `${fmtNumber(sets[0].weight)}kg — ${sets.map((s) => s.repetitions).join(" / ")}`;
  return sets.map((s) => `${fmtNumber(s.weight)}×${s.repetitions}`).join(" · ");
}

export const fmtRepRange = (min: number, max: number) => (min === max ? `${min} reps` : `${min}-${max} reps`);
