// "O que eu como agora?": combina alimentos que o usuário costuma comer para fechar o que
// falta da meta do dia — prioriza proteína sem estourar as calorias.

import { scaleMacros, sumMacros, type FoodMacros } from "./nutrition";
import type { Macros } from "./types";

export interface SuggestionFood extends FoodMacros {
  id: string;
  name: string;
  unit: "G" | "KG" | "ML" | "L" | "UNIT" | "PORTION";
  /** Quantidade habitual (mediana dos registros), na unidade base do alimento. */
  usualQuantity: number;
}

export interface SuggestionItem {
  foodId: string;
  name: string;
  unit: SuggestionFood["unit"];
  quantity: number;
  macros: Macros;
}

export interface MealSuggestion {
  items: SuggestionItem[];
  totals: Macros;
  score: number;
}

/** Abaixo disso a meta de calorias é considerada batida. */
const MIN_KCAL_GAP = 80;

export function remainingMacros(goal: Macros, eaten: Macros): Macros {
  return {
    kcal: Math.max(0, goal.kcal - eaten.kcal),
    protein: Math.max(0, goal.protein - eaten.protein),
    carbs: Math.max(0, goal.carbs - eaten.carbs),
    fat: Math.max(0, goal.fat - eaten.fat),
  };
}

/**
 * Alvo de UMA refeição: o que falta, limitado a ~35% da meta do dia. Sem isso, logo cedo
 * (falta o dia inteiro) as sugestões viram pratos gigantes.
 */
export function mealTarget(goal: Macros, gap: Macros, share = 0.35): Macros {
  const cap = (total: number, left: number, min: number) => Math.min(left, Math.max(min, total * share));
  return {
    kcal: cap(goal.kcal, gap.kcal, 350),
    protein: cap(goal.protein, gap.protein, 25),
    carbs: cap(goal.carbs, gap.carbs, 30),
    fat: cap(goal.fat, gap.fat, 12),
  };
}

/** "Arroz branco" + "Arroz integral" não é combinação: mesma primeira palavra = mesmo tipo. */
function sameKind(a: string, b: string) {
  const first = (s: string) => s.trim().split(/\s+/)[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return first(a) === first(b);
}

/** Variações de porção em torno da quantidade habitual. */
function portions(food: SuggestionFood): number[] {
  const q = food.usualQuantity;
  if (q <= 0) return [];
  if (food.unit === "UNIT" || food.unit === "PORTION") {
    const base = Math.max(1, Math.round(q));
    return [...new Set([base, base + 1, Math.max(1, base - 1)])];
  }
  const round = (n: number) => (n >= 50 ? Math.round(n / 10) * 10 : Math.round(n));
  return [...new Set([0.5, 1, 1.5, 2].map((k) => round(q * k)).filter((n) => n > 0))];
}

export function scoreSuggestion(m: Macros, gap: Macros): number {
  const kcalFill = Math.min(m.kcal, gap.kcal) / gap.kcal;
  const kcalOver = Math.max(0, m.kcal - gap.kcal) / gap.kcal;
  const needsProtein = gap.protein >= 10;
  const proteinFill = needsProtein ? Math.min(m.protein, gap.protein) / gap.protein : 0;
  const fatOver = Math.max(0, m.fat - gap.fat) / Math.max(gap.fat, 10);
  const carbOver = Math.max(0, m.carbs - gap.carbs) / Math.max(gap.carbs, 20);
  const fill = needsProtein ? 0.65 * proteinFill + 0.35 * kcalFill : kcalFill;
  return fill - 2.5 * kcalOver - 0.4 * fatOver - 0.25 * carbOver;
}

/**
 * Melhores opções (1 ou 2 alimentos) para o alvo informado (use `mealTarget`). Vazio se a meta
 * já foi batida ou se não houver histórico de alimentos.
 */
export function suggestMeals(gap: Macros, foods: readonly SuggestionFood[], limit = 3): MealSuggestion[] {
  if (gap.kcal < MIN_KCAL_GAP || foods.length === 0) return [];

  const options: SuggestionItem[][] = foods.map((f) =>
    portions(f).map((quantity) => ({ foodId: f.id, name: f.name, unit: f.unit, quantity, macros: scaleMacros(f, quantity) })),
  );

  const candidates: SuggestionItem[][] = [];
  for (let i = 0; i < options.length; i++) {
    for (const a of options[i]) {
      candidates.push([a]);
      for (let j = i + 1; j < options.length; j++) {
        if (sameKind(foods[i].name, foods[j].name)) continue;
        for (const b of options[j]) candidates.push([a, b]);
      }
    }
  }

  const scored = candidates
    .map((items) => {
      const totals = sumMacros(items.map((i) => i.macros));
      return { items, totals, score: scoreSuggestion(totals, gap) };
    })
    .filter((s) => s.totals.kcal <= gap.kcal * 1.1 && s.score > 0)
    .sort((a, b) => b.score - a.score);

  // Evita três variações do mesmo alimento: cada sugestão precisa trazer uma combinação nova.
  const picked: MealSuggestion[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    const key = s.items.map((i) => i.foodId).sort().join("+");
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(s);
    if (picked.length === limit) break;
  }
  return picked;
}

/** Mediana — quantidade "habitual" de um alimento no diário. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
