import { describe, expect, it } from "vitest";
import { roundToStep, suggestProgression, type ProgressionInput } from "./progression";
import type { SetLike } from "./types";

function base(overrides: Partial<ProgressionInput> = {}): ProgressionInput {
  return {
    lastSets: [],
    plannedSets: 3,
    repMin: 8,
    repMax: 12,
    incrementKg: 2.5,
    stepKg: 1,
    ...overrides,
  };
}

describe("roundToStep", () => {
  it("arredonda para o múltiplo mais próximo do passo", () => {
    expect(roundToStep(23, 5)).toBe(25);
    expect(roundToStep(22, 5)).toBe(20);
  });

  it("retorna o valor original quando o passo é <= 0", () => {
    expect(roundToStep(23, 0)).toBe(23);
  });
});

describe("suggestProgression", () => {
  it("sem séries: sugere ação none", () => {
    const r = suggestProgression(base());
    expect(r.action).toBe("none");
    expect(r.weight).toBeNull();
  });

  it("aumenta a carga ao bater o topo da faixa em todas as séries", () => {
    const lastSets: SetLike[] = [
      { weight: 50, repetitions: 12 },
      { weight: 50, repetitions: 12 },
      { weight: 50, repetitions: 12 },
    ];
    const r = suggestProgression(base({ lastSets }));
    expect(r.action).toBe("increase");
    expect(r.weight).toBe(52.5);
    expect(r.reps).toBe(8);
  });

  it("reduz ~10% quando as reps ficam muito abaixo do mínimo", () => {
    const lastSets: SetLike[] = [
      { weight: 100, repetitions: 5 },
      { weight: 100, repetitions: 5 },
      { weight: 100, repetitions: 5 },
    ];
    const r = suggestProgression(base({ lastSets }));
    expect(r.action).toBe("decrease");
    expect(r.weight).toBe(90); // 100 * 0.9 arredondado ao passo de 1
  });

  it("mantém a carga e busca mais reps no caso intermediário", () => {
    const lastSets: SetLike[] = [
      { weight: 50, repetitions: 9 },
      { weight: 50, repetitions: 9 },
      { weight: 50, repetitions: 9 },
    ];
    const r = suggestProgression(base({ lastSets }));
    expect(r.action).toBe("maintain");
    expect(r.weight).toBe(50);
    expect(r.reps).toBe(10); // melhor (9) + 1
  });

  it("usa a carga mais frequente (moda) como referência", () => {
    const lastSets: SetLike[] = [
      { weight: 60, repetitions: 12 },
      { weight: 50, repetitions: 12 },
      { weight: 50, repetitions: 12 },
    ];
    const r = suggestProgression(base({ lastSets }));
    // moda = 50; todas as séries de 50 bateram 12 → aumenta a partir de 50
    expect(r.action).toBe("increase");
    expect(r.weight).toBe(52.5);
  });

  it("ignora séries não concluídas", () => {
    const lastSets: SetLike[] = [
      { weight: 50, repetitions: 12 },
      { weight: 50, repetitions: 12 },
      { weight: 50, repetitions: 12 },
      { weight: 200, repetitions: 1, completed: false },
    ];
    const r = suggestProgression(base({ lastSets }));
    expect(r.action).toBe("increase");
    expect(r.weight).toBe(52.5);
  });
});
