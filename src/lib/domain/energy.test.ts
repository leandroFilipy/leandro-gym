import { describe, expect, it } from "vitest";
import { addDays } from "../dates";
import { energyBalance, estimateAdaptiveTdee, KCAL_PER_KG } from "./energy";
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
