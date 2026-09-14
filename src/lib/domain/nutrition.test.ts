import { describe, expect, it } from "vitest";
import { EMPTY_MACROS, scaleMacros, sumMacros, type FoodMacros } from "./nutrition";
import type { Macros } from "./types";

describe("scaleMacros", () => {
  const food: FoodMacros = { servingSize: 100, kcal: 200, protein: 20, carbs: 10, fat: 5 };

  it("recalcula os macros proporcionalmente à quantidade", () => {
    expect(scaleMacros(food, 150)).toEqual({ kcal: 300, protein: 30, carbs: 15, fat: 7.5 });
  });

  it("retorna zeros quando servingSize é 0", () => {
    expect(scaleMacros({ ...food, servingSize: 0 }, 150)).toEqual(EMPTY_MACROS);
  });

  it("arredonda para 1 casa decimal", () => {
    const r = scaleMacros({ servingSize: 3, kcal: 10, protein: 1, carbs: 1, fat: 1 }, 1);
    expect(r.kcal).toBe(3.3);
  });
});

describe("sumMacros", () => {
  it("soma uma lista de macros", () => {
    const items: Macros[] = [
      { kcal: 100, protein: 10, carbs: 5, fat: 2 },
      { kcal: 200, protein: 20, carbs: 10, fat: 4 },
    ];
    expect(sumMacros(items)).toEqual({ kcal: 300, protein: 30, carbs: 15, fat: 6 });
  });

  it("retorna zeros para lista vazia", () => {
    expect(sumMacros([])).toEqual(EMPTY_MACROS);
  });
});
