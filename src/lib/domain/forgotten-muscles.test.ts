import { describe, expect, it } from "vitest";
import { forgottenMuscles } from "./forgotten-muscles";

const planned = [
  { group: "CHEST" as const, dayName: "Upper" },
  { group: "HAMSTRINGS" as const, dayName: "Lower" },
  { group: "HAMSTRINGS" as const, dayName: "Lower" },
  { group: "CALVES" as const, dayName: "Lower" },
  { group: "CARDIO" as const, dayName: "Cardio" },
];

describe("forgottenMuscles", () => {
  it("avisa grupos da ficha sem série há 10+ dias, o mais antigo primeiro", () => {
    const r = forgottenMuscles({
      planned,
      lastTrained: { CHEST: "2026-09-16", HAMSTRINGS: "2026-09-06", CALVES: "2026-08-30" },
      today: "2026-09-18",
      trainedRecently: true,
    });
    expect(r).toEqual([
      { group: "CALVES", days: 19, dayNames: ["Lower"] },
      { group: "HAMSTRINGS", days: 12, dayNames: ["Lower"] },
    ]);
  });

  it("grupo da ficha nunca treinado vem primeiro; cardio é ignorado", () => {
    const r = forgottenMuscles({ planned, lastTrained: { CHEST: "2026-09-16", HAMSTRINGS: "2026-09-15" }, today: "2026-09-18", trainedRecently: true });
    expect(r.map((m) => [m.group, m.days])).toEqual([["CALVES", null]]);
  });

  it("sem treino recente não avisa nada", () => {
    expect(forgottenMuscles({ planned, lastTrained: {}, today: "2026-09-18", trainedRecently: false })).toEqual([]);
  });
});
