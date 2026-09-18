import { describe, expect, it } from "vitest";
import { expectedWaterByHour, isWaterBehind, waterGoalMl } from "./water";

describe("waterGoalMl", () => {
  it("35 ml por kg arredondado a 50 ml", () => {
    expect(waterGoalMl(80, null)).toBe(2800);
    expect(waterGoalMl(73, null)).toBe(2550); // 2555 → 2550
  });

  it("meta manual vence e sem peso usa 2,5 L", () => {
    expect(waterGoalMl(80, 3000)).toBe(3000);
    expect(waterGoalMl(null, null)).toBe(2500);
  });
});

describe("expectedWaterByHour / isWaterBehind", () => {
  it("distribui a meta entre 7h e 22h", () => {
    expect(expectedWaterByHour(3000, 6)).toBe(0);
    expect(expectedWaterByHour(3000, 13)).toBe(1200); // 6/15
    expect(expectedWaterByHour(3000, 23)).toBe(3000);
  });

  it("atrasado abaixo de 60% do esperado", () => {
    expect(isWaterBehind(600, 3000, 13)).toBe(true); // esperado 1200, 60% = 720
    expect(isWaterBehind(800, 3000, 13)).toBe(false);
    expect(isWaterBehind(0, 3000, 6)).toBe(false);
  });
});
