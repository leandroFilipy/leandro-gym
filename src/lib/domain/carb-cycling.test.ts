import { describe, expect, it } from "vitest";
import { goalForDay } from "./carb-cycling";

const goal = { kcal: 2500, protein: 180, carbs: 280, fat: 70 };

describe("goalForDay", () => {
  it("descanso tira carboidrato e as calorias correspondentes", () => {
    expect(goalForDay(goal, "rest", { restDayCarbsCut: 60, trainingDays: 5, restDays: 2 })).toEqual({ kcal: 2260, protein: 180, carbs: 220, fat: 70 });
  });

  it("treino recebe o que saiu do descanso dividido entre os dias (média semanal igual)", () => {
    const cycle = { restDayCarbsCut: 60, trainingDays: 4, restDays: 3 };
    const train = goalForDay(goal, "training", cycle);
    const rest = goalForDay(goal, "rest", cycle);
    expect(train.carbs).toBe(325); // 280 + 60·3/4 = 325
    expect((train.carbs * 4 + rest.carbs * 3) / 7).toBeCloseTo(280, 0);
  });

  it("proteína e gordura não mudam", () => {
    const r = goalForDay(goal, "rest", { restDayCarbsCut: 60, trainingDays: 5, restDays: 2 });
    expect(r.protein).toBe(180);
    expect(r.fat).toBe(70);
  });

  it("sem dias de descanso ou sem corte, mantém a meta", () => {
    expect(goalForDay(goal, "training", { restDayCarbsCut: 60, trainingDays: 7, restDays: 0 })).toEqual(goal);
    expect(goalForDay(goal, "rest", { restDayCarbsCut: 0, trainingDays: 5, restDays: 2 })).toEqual(goal);
  });

  it("não deixa carboidrato negativo", () => {
    expect(goalForDay({ ...goal, carbs: 40 }, "rest", { restDayCarbsCut: 60, trainingDays: 5, restDays: 2 }).carbs).toBe(0);
  });
});
