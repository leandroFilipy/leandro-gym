import { describe, expect, it } from "vitest";
import { buildTrainingHeatmap, levelFor, levelThresholds } from "./training-heatmap";

describe("levelThresholds / levelFor", () => {
  it("usa os quartis dos dias treinados", () => {
    const t = levelThresholds([0, 4, 8, 12, 16, 20, 24, 28, 32]);
    expect(t).toEqual([12, 20, 28]);
    expect(levelFor(0, t)).toBe(0);
    expect(levelFor(4, t)).toBe(1);
    expect(levelFor(12, t)).toBe(2);
    expect(levelFor(20, t)).toBe(3);
    expect(levelFor(32, t)).toBe(4);
  });

  it("sem treinos, tudo nível 0", () => {
    expect(levelFor(0, levelThresholds([]))).toBe(0);
  });
});

describe("buildTrainingHeatmap", () => {
  // 2026-09-18 é sexta; a semana começa na segunda 14/09.
  const today = "2026-09-18";

  it("monta 53 semanas de 7 dias terminando na semana atual", () => {
    const h = buildTrainingHeatmap(new Map(), today);
    expect(h.weeks).toHaveLength(53);
    expect(h.weeks.every((w) => w.length === 7)).toBe(true);
    expect(h.weeks.at(-1)![0].date).toBe("2026-09-14");
    expect(h.weeks.at(-1)![5].future).toBe(true); // sábado 19/09
  });

  it("conta dias treinados e sequência de semanas", () => {
    const sets = new Map([
      ["2026-09-01", 20], // semana de 31/08
      ["2026-09-08", 18], // semana de 07/09
      ["2026-09-09", 22],
      ["2026-08-18", 15], // semana de 17/08 (quebra antes de 24/08)
    ]);
    const h = buildTrainingHeatmap(sets, today);
    expect(h.trainedDays).toBe(4);
    expect(h.activeWeeks).toBe(3);
    // semana atual sem treino → conta a partir da passada: 07/09 e 31/08
    expect(h.currentWeekStreak).toBe(2);
    expect(h.bestWeekStreak).toBe(2);
  });

  it("marca o início de cada mês", () => {
    const h = buildTrainingHeatmap(new Map(), today);
    const months = h.months.map((m) => m.month);
    expect(months.at(-1)).toBe(9);
    expect(months).toContain(1);
  });
});
