import { describe, expect, it } from "vitest";
import { mealTarget, median, remainingMacros, suggestMeals, type SuggestionFood } from "./meal-suggestions";

const food = (id: string, per100: [number, number, number, number], usualQuantity = 100, unit: SuggestionFood["unit"] = "G"): SuggestionFood => ({
  id,
  name: id,
  unit,
  servingSize: 100,
  kcal: per100[0],
  protein: per100[1],
  carbs: per100[2],
  fat: per100[3],
  usualQuantity,
});

const frango = food("frango", [160, 32, 0, 3], 150);
const arroz = food("arroz", [130, 2.5, 28, 0.3], 150);
const whey = food("whey", [400, 80, 8, 6], 30);
const amendoim = food("amendoim", [590, 25, 20, 49], 20);

describe("remainingMacros", () => {
  it("não fica negativo", () => {
    expect(remainingMacros({ kcal: 2000, protein: 150, carbs: 200, fat: 60 }, { kcal: 2100, protein: 100, carbs: 250, fat: 30 })).toEqual({
      kcal: 0,
      protein: 50,
      carbs: 0,
      fat: 30,
    });
  });
});

describe("suggestMeals", () => {
  it("sem espaço de calorias não sugere nada", () => {
    expect(suggestMeals({ kcal: 50, protein: 30, carbs: 0, fat: 0 }, [frango])).toEqual([]);
  });

  it("prioriza proteína quando ela está faltando", () => {
    const [best] = suggestMeals({ kcal: 400, protein: 50, carbs: 20, fat: 10 }, [arroz, frango, amendoim]);
    expect(best.items.map((i) => i.foodId)).toContain("frango");
    expect(best.totals.kcal).toBeLessThanOrEqual(440);
  });

  it("não estoura as calorias", () => {
    const list = suggestMeals({ kcal: 300, protein: 40, carbs: 60, fat: 10 }, [frango, arroz, whey, amendoim]);
    expect(list.length).toBeGreaterThan(0);
    for (const s of list) expect(s.totals.kcal).toBeLessThanOrEqual(330);
  });

  it("não repete a mesma combinação de alimentos", () => {
    const list = suggestMeals({ kcal: 800, protein: 60, carbs: 100, fat: 20 }, [frango, arroz, whey]);
    const keys = list.map((s) => s.items.map((i) => i.foodId).sort().join("+"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("alimento por unidade varia em unidades inteiras", () => {
    const ovo = food("ovo", [70, 6, 0.5, 5], 2, "UNIT");
    ovo.servingSize = 1;
    const list = suggestMeals({ kcal: 300, protein: 30, carbs: 10, fat: 20 }, [ovo]);
    for (const s of list) for (const i of s.items) expect(Number.isInteger(i.quantity)).toBe(true);
  });
});

describe("mealTarget", () => {
  const goal = { kcal: 2400, protein: 180, carbs: 250, fat: 70 };

  it("limita a uma refeição quando falta o dia inteiro", () => {
    const t = mealTarget(goal, goal);
    expect(t.kcal).toBeCloseTo(840);
    expect(t.protein).toBeCloseTo(63);
    expect(t.carbs).toBeCloseTo(87.5);
    expect(t.fat).toBeCloseTo(24.5);
  });

  it("no fim do dia usa o que realmente falta", () => {
    expect(mealTarget(goal, { kcal: 200, protein: 10, carbs: 5, fat: 3 })).toEqual({ kcal: 200, protein: 10, carbs: 5, fat: 3 });
  });
});

describe("suggestMeals — tipos de alimento", () => {
  it("não combina dois alimentos do mesmo tipo", () => {
    const integral = { ...food("Arroz integral", [124, 2.6, 26, 1], 150) };
    const branco = { ...food("Arroz branco", [128, 2.5, 28, 0.2], 150) };
    const list = suggestMeals({ kcal: 900, protein: 20, carbs: 200, fat: 10 }, [integral, branco]);
    for (const s of list) expect(s.items.length).toBe(1);
  });
});

describe("median", () => {
  it("par e ímpar", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
