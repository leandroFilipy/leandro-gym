import type { Macros } from "./types";

export interface FoodMacros extends Macros {
  servingSize: number;
}

/** Recalcula os macros de um alimento para a quantidade informada. */
export function scaleMacros(food: FoodMacros, quantity: number): Macros {
  const f = food.servingSize > 0 ? quantity / food.servingSize : 0;
  return {
    kcal: round(food.kcal * f),
    protein: round(food.protein * f),
    carbs: round(food.carbs * f),
    fat: round(food.fat * f),
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

function round(n: number) {
  return Math.round(n * 10) / 10;
}
