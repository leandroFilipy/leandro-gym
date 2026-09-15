// Medidas selecionáveis ao registrar um alimento no diário.
//
// Cada alimento tem uma unidade "base" (a do cadastro, em que os macros são medidos).
// Além da própria unidade e das compatíveis (massa: g/kg; volume: ml/L), oferecemos
// "medidas caseiras" (scoop, colher, xícara…) que convertem para gramas/ml.
//
// Como o peso de uma medida caseira depende do alimento (1 scoop de whey ≈ 30 g,
// 1 colher de pasta de amendoim ≈ 20 g), cada alimento pode declarar equivalências
// próprias em GRAMAS_POR_MEDIDA_POR_ALIMENTO (por nome, para o catálogo base).

export type FoodUnit = "G" | "KG" | "ML" | "L" | "UNIT" | "PORTION";

/** Uma medida que o usuário pode escolher; `toBase` converte 1 dela para a unidade base. */
export interface Measure {
  id: string; // identificador estável (usado no seletor)
  label: string; // rótulo curto exibido
  toBase: number; // quanto vale 1 dessa medida na unidade base do alimento
}

const TO_CANONICAL: Record<FoodUnit, number> = { G: 1, KG: 1000, ML: 1, L: 1000, UNIT: 1, PORTION: 1 };
const MASS: FoodUnit[] = ["G", "KG"];
const VOLUME: FoodUnit[] = ["ML", "L"];

const UNIT_LABEL: Record<FoodUnit, string> = { G: "g", KG: "kg", ML: "ml", L: "L", UNIT: "un", PORTION: "porção" };

/** Gramas por medida caseira, específico de cada alimento base (por nome). */
const GRAMS_PER_MEASURE_BY_FOOD: Record<string, Record<string, number>> = {
  "Whey Growth concentrado 80% natural": { scoop: 30 },
  "Whey protein concentrado (genérico)": { scoop: 30 },
  "Whey protein isolado (genérico)": { scoop: 30 },
  "Creatina monohidratada": { scoop: 3, colher_cha: 3 },
  "Aveia em flocos": { colher_sopa: 15, xicara: 90 },
  "Pasta de amendoim integral": { colher_sopa: 20, colher_cha: 7 },
  "Amendoim torrado": { punhado: 30, colher_sopa: 12 },
  "Azeite de oliva extravirgem": { colher_sopa: 13, colher_cha: 5, fio: 5 },
};

/** Rótulos das medidas caseiras conhecidas. */
const HOUSEHOLD_LABEL: Record<string, string> = {
  scoop: "scoop",
  colher_sopa: "colher (sopa)",
  colher_cha: "colher (chá)",
  xicara: "xícara",
  punhado: "punhado",
  fatia: "fatia",
  fio: "fio",
};

/**
 * Medidas disponíveis para um alimento, na ordem de exibição.
 * Inclui: a unidade base + compatíveis da mesma família + medidas caseiras do alimento.
 */
export function measuresFor(food: { name: string; unit: FoodUnit }): Measure[] {
  const base = food.unit;
  const measures: Measure[] = [];

  // 1) Unidade base e compatíveis (massa g/kg, volume ml/L).
  const family = MASS.includes(base) ? MASS : VOLUME.includes(base) ? VOLUME : [base];
  for (const u of family) {
    // fator: quanto 1 "u" vale na unidade base. Ex.: base G, u KG → 1000.
    measures.push({ id: `u:${u}`, label: UNIT_LABEL[u], toBase: TO_CANONICAL[u] / TO_CANONICAL[base] });
  }

  // 2) Medidas caseiras específicas do alimento (só quando a base é massa/volume,
  //    porque a equivalência é em gramas/ml).
  if (MASS.includes(base) || VOLUME.includes(base)) {
    const perFood = GRAMS_PER_MEASURE_BY_FOOD[food.name];
    if (perFood) {
      for (const [key, gramsOrMl] of Object.entries(perFood)) {
        // gramsOrMl está na unidade canônica (g ou ml); converte para a base do alimento.
        measures.push({ id: `h:${key}`, label: HOUSEHOLD_LABEL[key] ?? key, toBase: gramsOrMl / TO_CANONICAL[base] });
      }
    }
  }

  return measures;
}

/** Converte uma quantidade na `measure` escolhida para a unidade base do alimento. */
export function toBaseQuantity(quantity: number, measure: Measure): number {
  return quantity * measure.toBase;
}

/** Passo sugerido no +/- para uma medida (medidas caseiras andam de 0,5; kg/L de 0,1). */
export function stepForMeasure(measure: Measure, servingSize: number): number {
  if (measure.id.startsWith("h:")) return 0.5; // scoop, colher…
  if (measure.id === "u:KG" || measure.id === "u:L") return 0.1;
  if (measure.id === "u:UNIT" || measure.id === "u:PORTION") return 1;
  return servingSize >= 100 ? 10 : 5; // g / ml
}

/** Casas decimais para a medida (caseiras e kg/L usam 1; g/ml usam 0). */
export function decimalsForMeasure(measure: Measure): number {
  if (measure.id.startsWith("h:") || measure.id === "u:KG" || measure.id === "u:L") return 1;
  return 0;
}

// Mantido para compatibilidade com testes/uso anterior.
export function compatibleUnits(base: FoodUnit): FoodUnit[] {
  if (MASS.includes(base)) return MASS;
  if (VOLUME.includes(base)) return VOLUME;
  return [base];
}

export function convertQuantity(quantity: number, from: FoodUnit, to: FoodUnit): number {
  if (from === to) return quantity;
  const canonical = quantity * TO_CANONICAL[from];
  const factor = TO_CANONICAL[to] || 1;
  return canonical / factor;
}
