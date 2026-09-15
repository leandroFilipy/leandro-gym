import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import {
  ageFromBirthDate,
  computeNutritionGoal,
  computeNutritionGoalBreakdown,
  energyBalance,
  estimateAdaptiveTdee,
  KCAL_PER_KG,
  mifflinStJeorBMR,
} from "./energy";
import type { DatedValue } from "./types";

describe("energyBalance", () => {
  it("calcula balanço diário e semanal a partir do TDEE", () => {
    const intakes: DatedValue[] = [
      { date: "2026-01-01", value: 2000 },
      { date: "2026-01-02", value: 2200 },
    ];
    const r = energyBalance(2500, intakes);
    expect(r.avgIntake).toBe(2100);
    expect(r.daysLogged).toBe(2);
    expect(r.dailyBalance).toBe(-400); // déficit
    expect(r.weeklyBalance).toBe(-2800);
  });

  it("ignora dias sem registro (value <= 0)", () => {
    const intakes: DatedValue[] = [
      { date: "2026-01-01", value: 2000 },
      { date: "2026-01-02", value: 0 },
    ];
    const r = energyBalance(2000, intakes);
    expect(r.avgIntake).toBe(2000);
    expect(r.daysLogged).toBe(1);
  });

  it("dailyBalance é null sem TDEE ou sem registros", () => {
    expect(energyBalance(null, [{ date: "2026-01-01", value: 2000 }]).dailyBalance).toBeNull();
    expect(energyBalance(2000, []).dailyBalance).toBeNull();
  });
});

describe("estimateAdaptiveTdee", () => {
  it("retorna null com poucos dados de peso", () => {
    const weights: DatedValue[] = [{ date: "2026-01-01", value: 80 }];
    const intakes: DatedValue[] = [{ date: "2026-01-01", value: 2000 }];
    expect(estimateAdaptiveTdee(weights, intakes)).toBeNull();
  });

  it("com peso estável, TDEE ≈ consumo médio", () => {
    const weights: DatedValue[] = Array.from({ length: 15 }, (_, i) => ({
      date: addDays("2026-01-01", i),
      value: 80,
    }));
    const intakes: DatedValue[] = Array.from({ length: 15 }, (_, i) => ({
      date: addDays("2026-01-01", i),
      value: 2500,
    }));
    const r = estimateAdaptiveTdee(weights, intakes);
    expect(r).not.toBeNull();
    expect(r!.tdee).toBeCloseTo(2500, 6);
    expect(r!.weightTrendKgPerWeek).toBeCloseTo(0, 6);
    expect(r!.days).toBe(14);
  });

  it("perdendo peso, o TDEE estimado fica acima do consumo médio", () => {
    // -0.1 kg/dia → tendência de queda; gasto = consumo - (slope * 7700)
    const weights: DatedValue[] = Array.from({ length: 15 }, (_, i) => ({
      date: addDays("2026-01-01", i),
      value: 80 - i * 0.1,
    }));
    const intakes: DatedValue[] = Array.from({ length: 15 }, (_, i) => ({
      date: addDays("2026-01-01", i),
      value: 2000,
    }));
    const r = estimateAdaptiveTdee(weights, intakes);
    expect(r).not.toBeNull();
    expect(r!.tdee).toBeCloseTo(2000 + 0.1 * KCAL_PER_KG, 3); // slope = -0.1/dia
    expect(r!.weightTrendKgPerWeek).toBeCloseTo(-0.7, 6);
  });
});

describe("mifflinStJeorBMR", () => {
  it("homem: 10·peso + 6.25·altura − 5·idade + 5", () => {
    // 80 kg, 180 cm, 30 anos → 800 + 1125 − 150 + 5 = 1780
    expect(mifflinStJeorBMR({ weightKg: 80, heightCm: 180, ageYears: 30, sex: "MALE" })).toBe(1780);
  });

  it("mulher: usa o offset de −161", () => {
    // 60 kg, 165 cm, 30 anos → 600 + 1031.25 − 150 − 161 = 1320.25
    expect(mifflinStJeorBMR({ weightKg: 60, heightCm: 165, ageYears: 30, sex: "FEMALE" })).toBeCloseTo(1320.25, 6);
  });
});

describe("computeNutritionGoal", () => {
  const base = { weightKg: 80, heightCm: 180, ageYears: 30, sex: "MALE" as const };

  it("manutenção: kcal ≈ BMR × fator de atividade, sem ajuste", () => {
    const g = computeNutritionGoal({ ...base, activityLevel: "MODERATE", dietGoal: "MAINTAIN" });
    // BMR 1780 × 1.55 = 2759
    expect(g.kcal).toBe(2759);
    expect(g.protein).toBe(Math.round(1.8 * 80)); // 144
    expect(g.fat).toBe(Math.round(0.9 * 80)); // 72
    // carbo = (kcal − prot·4 − fat·9) / 4
    expect(g.carbs).toBe(Math.round((2759 - 144 * 4 - 72 * 9) / 4));
  });

  it("emagrecimento aplica déficit e mais proteína", () => {
    const maintain = computeNutritionGoal({ ...base, activityLevel: "MODERATE", dietGoal: "MAINTAIN" });
    const lose = computeNutritionGoal({ ...base, activityLevel: "MODERATE", dietGoal: "LOSE" });
    expect(lose.kcal).toBeLessThan(maintain.kcal);
    expect(lose.protein).toBeGreaterThan(maintain.protein);
  });

  it("ganho aplica superávit", () => {
    const maintain = computeNutritionGoal({ ...base, activityLevel: "MODERATE", dietGoal: "MAINTAIN" });
    const gain = computeNutritionGoal({ ...base, activityLevel: "MODERATE", dietGoal: "GAIN" });
    expect(gain.kcal).toBeGreaterThan(maintain.kcal);
  });

  it("nível de atividade maior → mais calorias", () => {
    const sed = computeNutritionGoal({ ...base, activityLevel: "SEDENTARY", dietGoal: "MAINTAIN" });
    const active = computeNutritionGoal({ ...base, activityLevel: "VERY_ACTIVE", dietGoal: "MAINTAIN" });
    expect(active.kcal).toBeGreaterThan(sed.kcal);
  });

  it("mudar o peso muda a meta (o bug reportado)", () => {
    const g70 = computeNutritionGoal({ ...base, weightKg: 70, activityLevel: "MODERATE", dietGoal: "MAINTAIN" });
    const g90 = computeNutritionGoal({ ...base, weightKg: 90, activityLevel: "MODERATE", dietGoal: "MAINTAIN" });
    expect(g90.kcal).toBeGreaterThan(g70.kcal);
    expect(g90.protein).toBeGreaterThan(g70.protein);
    expect(g90.fat).toBeGreaterThan(g70.fat);
  });

  it("todos os macros são inteiros não-negativos", () => {
    const g = computeNutritionGoal({ ...base, activityLevel: "LIGHT", dietGoal: "LOSE" });
    for (const v of [g.kcal, g.protein, g.carbs, g.fat]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("ageFromBirthDate", () => {
  it("calcula anos completos", () => {
    expect(ageFromBirthDate(new Date("1990-06-15"), new Date("2026-06-15"))).toBe(36);
  });

  it("ainda não fez aniversário no ano", () => {
    expect(ageFromBirthDate(new Date("1990-12-31"), new Date("2026-06-15"))).toBe(35);
  });
});

describe("computeNutritionGoalBreakdown", () => {
  it("exemplo Mifflin-St Jeor: homem 70kg/180cm/25a → TMB 1705", () => {
    const b = computeNutritionGoalBreakdown({
      weightKg: 70,
      heightCm: 180,
      ageYears: 25,
      sex: "MALE",
      activityLevel: "MODERATE",
      dietGoal: "MAINTAIN",
    });
    // 700 + 1125 − 125 + 5 = 1705
    expect(b.bmr).toBe(1705);
    // TDEE = 1705 × 1.55 = 2642.75 → 2643
    expect(b.tdee).toBe(Math.round(1705 * 1.55));
  });

  it("o goal do breakdown bate com computeNutritionGoal", () => {
    const profile = {
      weightKg: 82,
      heightCm: 178,
      ageYears: 31,
      sex: "MALE" as const,
      activityLevel: "ACTIVE" as const,
      dietGoal: "LOSE" as const,
    };
    expect(computeNutritionGoalBreakdown(profile).goal).toEqual(computeNutritionGoal(profile));
  });

  it("nível de atividade maior aumenta o TDEE sobre a mesma TMB", () => {
    const base = { weightKg: 70, heightCm: 180, ageYears: 25, sex: "MALE" as const, dietGoal: "MAINTAIN" as const };
    const sed = computeNutritionGoalBreakdown({ ...base, activityLevel: "SEDENTARY" });
    const act = computeNutritionGoalBreakdown({ ...base, activityLevel: "VERY_ACTIVE" });
    expect(sed.bmr).toBe(act.bmr); // mesma TMB
    expect(act.tdee).toBeGreaterThan(sed.tdee); // TDEE maior
  });
});
