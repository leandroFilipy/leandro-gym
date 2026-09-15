// Conversão entre unidades compatíveis de um alimento.
//
// Cada alimento tem uma unidade "base" (a do cadastro, em que os macros são medidos).
// Ao registrar no diário, o usuário pode escolher uma unidade compatível da mesma família
// (massa: g/kg, volume: ml/L) — a quantidade é convertida de volta para a unidade base
// antes de calcular os macros no servidor. UNIT e PORTION não convertem para massa/volume.

export type FoodUnit = "G" | "KG" | "ML" | "L" | "UNIT" | "PORTION";

/** Fator para converter 1 unidade para a unidade base da família (g para massa, ml para volume). */
const TO_CANONICAL: Record<FoodUnit, number> = {
  G: 1,
  KG: 1000,
  ML: 1,
  L: 1000,
  UNIT: 1,
  PORTION: 1,
};

const MASS: FoodUnit[] = ["G", "KG"];
const VOLUME: FoodUnit[] = ["ML", "L"];

/** Unidades que o usuário pode escolher ao registrar, dada a unidade base do alimento. */
export function compatibleUnits(base: FoodUnit): FoodUnit[] {
  if (MASS.includes(base)) return MASS;
  if (VOLUME.includes(base)) return VOLUME;
  return [base]; // UNIT / PORTION: sem alternativas
}

/**
 * Converte uma quantidade de `from` para a unidade base `to`.
 * Só faz sentido entre unidades da mesma família (validado por `compatibleUnits`).
 * Ex.: 1.5 KG com base G → 1500; 250 ML com base ML → 250.
 */
export function convertQuantity(quantity: number, from: FoodUnit, to: FoodUnit): number {
  if (from === to) return quantity;
  const canonical = quantity * TO_CANONICAL[from];
  const factor = TO_CANONICAL[to] || 1;
  return canonical / factor;
}
