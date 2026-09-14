import { describe, expect, it } from "vitest";
import { bestSet, estimate1RM, percentChange, totalVolume } from "./volume";
import type { SetLike } from "./types";

describe("totalVolume", () => {
  it("soma carga × reps das séries concluídas", () => {
    const sets: SetLike[] = [
      { weight: 100, repetitions: 5 },
      { weight: 80, repetitions: 8 },
    ];
    expect(totalVolume(sets)).toBe(100 * 5 + 80 * 8);
  });

  it("ignora séries com completed === false", () => {
    const sets: SetLike[] = [
      { weight: 100, repetitions: 5, completed: true },
      { weight: 80, repetitions: 8, completed: false },
    ];
    expect(totalVolume(sets)).toBe(500);
  });

  it("considera concluída quando completed é undefined", () => {
    expect(totalVolume([{ weight: 50, repetitions: 10 }])).toBe(500);
  });

  it("retorna 0 para lista vazia", () => {
    expect(totalVolume([])).toBe(0);
  });
});

describe("percentChange", () => {
  it("calcula variação percentual", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
  });

  it("retorna null quando a base é 0", () => {
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("estimate1RM", () => {
  it("é a própria carga para 1 rep", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });

  it("aplica Epley para múltiplas reps", () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(100 * (1 + 10 / 30), 6);
  });

  it("retorna 0 para entradas inválidas", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
    expect(estimate1RM(-10, 5)).toBe(0);
  });
});

describe("bestSet", () => {
  it("escolhe a série com maior 1RM estimado", () => {
    const sets: SetLike[] = [
      { weight: 100, repetitions: 1 }, // 1RM = 100
      { weight: 80, repetitions: 10 }, // 1RM ≈ 106.7
    ];
    expect(bestSet(sets)).toEqual({ weight: 80, repetitions: 10 });
  });

  it("ignora séries não concluídas", () => {
    const sets: SetLike[] = [
      { weight: 200, repetitions: 5, completed: false },
      { weight: 60, repetitions: 5 },
    ];
    expect(bestSet(sets)).toEqual({ weight: 60, repetitions: 5 });
  });

  it("retorna null sem séries", () => {
    expect(bestSet([])).toBeNull();
  });
});
