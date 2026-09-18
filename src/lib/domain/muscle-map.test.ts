import { describe, expect, it } from "vitest";
import { buildMuscleMap, muscleLevel } from "./muscle-map";

describe("muscleLevel", () => {
  it("semana: compara com a faixa do grupo (peito 10–20)", () => {
    expect(muscleLevel(0, "CHEST", "semana").level).toBe(0);
    expect(muscleLevel(6, "CHEST", "semana").level).toBe(1);
    expect(muscleLevel(12, "CHEST", "semana").level).toBe(2);
    expect(muscleLevel(24, "CHEST", "semana").level).toBe(3);
  });

  it("30 dias escala a faixa (~4,3 semanas)", () => {
    const r = muscleLevel(50, "CHEST", "30d");
    expect(r.target).toEqual({ min: 43, max: 86 });
    expect(r.level).toBe(2);
  });

  it("hoje: por quantidade de séries", () => {
    expect(muscleLevel(0, "BICEPS", "hoje").level).toBe(0);
    expect(muscleLevel(3, "BICEPS", "hoje").level).toBe(1);
    expect(muscleLevel(6, "BICEPS", "hoje").level).toBe(2);
    expect(muscleLevel(12, "BICEPS", "hoje").level).toBe(3);
  });
});

describe("buildMuscleMap", () => {
  it("inclui todos os grupos do boneco, sem cardio/outro", () => {
    const map = buildMuscleMap({ CHEST: 12, CARDIO: 5 }, "semana");
    expect(map.find((m) => m.group === "CHEST")?.level).toBe(2);
    expect(map.find((m) => m.group === "QUADS")?.sets).toBe(0);
    expect(map.some((m) => m.group === "CARDIO")).toBe(false);
  });
});
