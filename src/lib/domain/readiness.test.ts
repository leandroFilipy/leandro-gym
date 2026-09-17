import { describe, expect, it } from "vitest";
import { adjustForReadiness, readinessImpact, readinessLevel, readinessScore } from "./readiness";

describe("readinessScore", () => {
  it("vai de 0 (tudo 1) a 100 (tudo 5)", () => {
    expect(readinessScore({ sleep: 1, soreness: 1, energy: 1 })).toBe(0);
    expect(readinessScore({ sleep: 5, soreness: 5, energy: 5 })).toBe(100);
    expect(readinessScore({ sleep: 3, soreness: 3, energy: 3 })).toBe(50);
  });

  it("sono pesa mais que dor muscular", () => {
    expect(readinessScore({ sleep: 1, soreness: 5, energy: 3 })).toBeLessThan(readinessScore({ sleep: 5, soreness: 1, energy: 3 }));
  });

  it("classifica em baixa, normal e alta", () => {
    expect(readinessLevel(30)).toBe("low");
    expect(readinessLevel(60)).toBe("normal");
    expect(readinessLevel(80)).toBe("high");
  });
});

describe("adjustForReadiness", () => {
  const opts = { incrementKg: 2, stepKg: 1 };

  it("dia ruim: não sobe e usa 10% a menos que a carga de trabalho", () => {
    const r = adjustForReadiness({ action: "increase", weight: 42, reps: 8, message: "" }, "low", opts);
    expect(r.action).toBe("decrease");
    expect(r.weight).toBe(36); // 40 × 0,9
  });

  it("dia ruim mantendo carga: 10% a menos", () => {
    expect(adjustForReadiness({ action: "maintain", weight: 100, reps: 10, message: "" }, "low", opts).weight).toBe(90);
  });

  it("dia normal ou sem carga de referência: sem mudança", () => {
    const s = { action: "maintain" as const, weight: 50, reps: 10, message: "Mantenha" };
    expect(adjustForReadiness(s, "normal", opts)).toBe(s);
    const none = { action: "none" as const, weight: null, reps: 12, message: "Primeira vez" };
    expect(adjustForReadiness(none, "low", opts)).toBe(none);
  });

  it("dia bom: mantém a carga e incentiva", () => {
    const r = adjustForReadiness({ action: "maintain", weight: 50, reps: 10, message: "Mantenha." }, "high", opts);
    expect(r.weight).toBe(50);
    expect(r.message).toContain("recorde");
  });
});

describe("readinessImpact", () => {
  it("compara a variação de volume em dias ruins e bons", () => {
    const r = readinessImpact([
      { score: 30, volumeRatio: 0.9 },
      { score: 20, volumeRatio: 0.94 },
      { score: 80, volumeRatio: 1.05 },
      { score: 60, volumeRatio: 1.01 },
    ]);
    expect(r.low).toEqual({ count: 2, avgChangePct: -8 });
    expect(r.good).toEqual({ count: 2, avgChangePct: 3 });
    expect(r.diffPct).toBe(11);
  });

  it("poucos dados: sem diferença", () => {
    expect(readinessImpact([{ score: 30, volumeRatio: 0.9 }]).diffPct).toBeNull();
  });
});
