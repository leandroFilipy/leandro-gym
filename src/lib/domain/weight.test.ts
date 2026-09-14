import { describe, expect, it } from "vitest";
import { averageBetween, movingAverage, weeklyComparison } from "./weight";
import type { DatedValue } from "./types";

const entries: DatedValue[] = [
  { date: "2026-01-01", value: 80 },
  { date: "2026-01-02", value: 82 },
  { date: "2026-01-03", value: 84 },
];

describe("averageBetween", () => {
  it("faz a média dos registros no intervalo inclusive", () => {
    expect(averageBetween(entries, "2026-01-01", "2026-01-03")).toBe(82);
    expect(averageBetween(entries, "2026-01-01", "2026-01-02")).toBe(81);
  });

  it("retorna null quando não há registros no intervalo", () => {
    expect(averageBetween(entries, "2026-02-01", "2026-02-28")).toBeNull();
  });
});

describe("movingAverage", () => {
  it("calcula a média móvel usando a janela informada", () => {
    const result = movingAverage(entries, 2);
    expect(result[0]).toEqual({ date: "2026-01-01", value: 80 });
    expect(result[1]).toEqual({ date: "2026-01-02", value: 81 }); // (80+82)/2
    expect(result[2]).toEqual({ date: "2026-01-03", value: 83 }); // (82+84)/2
  });

  it("ordena por data antes de calcular", () => {
    const unsorted: DatedValue[] = [
      { date: "2026-01-03", value: 84 },
      { date: "2026-01-01", value: 80 },
      { date: "2026-01-02", value: 82 },
    ];
    const result = movingAverage(unsorted, 2);
    expect(result.map((e) => e.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});

describe("weeklyComparison", () => {
  it("compara a média dos últimos 7 dias com os 7 anteriores", () => {
    const data: DatedValue[] = [
      // semana anterior (13..7 dias atrás a partir de 2026-01-14)
      { date: "2026-01-01", value: 80 },
      { date: "2026-01-07", value: 80 },
      // semana atual (últimos 7 dias, inclui hoje)
      { date: "2026-01-08", value: 82 },
      { date: "2026-01-14", value: 82 },
    ];
    const r = weeklyComparison(data, "2026-01-14");
    expect(r.currentAvg).toBe(82);
    expect(r.previousAvg).toBe(80);
    expect(r.change).toBe(2);
  });

  it("change é null quando falta uma das semanas", () => {
    const data: DatedValue[] = [{ date: "2026-01-14", value: 82 }];
    const r = weeklyComparison(data, "2026-01-14");
    expect(r.currentAvg).toBe(82);
    expect(r.previousAvg).toBeNull();
    expect(r.change).toBeNull();
  });
});
