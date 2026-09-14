import { describe, expect, it } from "vitest";
import { isNewRecord } from "./records";
import { estimate1RM } from "./volume";

describe("isNewRecord", () => {
  it("não conta recorde sem histórico anterior", () => {
    expect(isNewRecord({ weight: 100, repetitions: 5 }, null)).toBe(false);
    expect(isNewRecord({ weight: 100, repetitions: 5 }, 0)).toBe(false);
  });

  it("é recorde quando o 1RM estimado supera o melhor anterior", () => {
    const prev = estimate1RM(100, 5); // ≈ 116.7
    expect(isNewRecord({ weight: 100, repetitions: 6 }, prev)).toBe(true);
  });

  it("não é recorde quando iguala o melhor anterior", () => {
    const prev = estimate1RM(100, 5);
    expect(isNewRecord({ weight: 100, repetitions: 5 }, prev)).toBe(false);
  });

  it("não é recorde quando fica abaixo do melhor anterior", () => {
    const prev = estimate1RM(100, 10);
    expect(isNewRecord({ weight: 100, repetitions: 5 }, prev)).toBe(false);
  });
});
