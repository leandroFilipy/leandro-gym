import { describe, expect, it } from "vitest";
import { measurementDeltas, waistToHip } from "./measurements";

describe("measurementDeltas", () => {
  it("calcula variação total e desde o registro anterior, por campo", () => {
    const deltas = measurementDeltas([
      { date: "2026-09-15", waist: 84.5, arm: 38 },
      { date: "2026-08-01", waist: 88, arm: 37 },
      { date: "2026-09-01", waist: 86 },
    ]);
    const waist = deltas.find((d) => d.field === "waist")!;
    expect(waist).toMatchObject({ latest: 84.5, first: 88, change: -3.5, previous: 86, sincePrevious: -1.5 });
    const arm = deltas.find((d) => d.field === "arm")!;
    expect(arm).toMatchObject({ latest: 38, change: 1, previous: 37, sincePrevious: 1 });
  });

  it("omite campos nunca medidos e trata registro único", () => {
    const deltas = measurementDeltas([{ date: "2026-09-01", hip: 100, chest: null }]);
    expect(deltas).toHaveLength(1);
    expect(deltas[0]).toMatchObject({ field: "hip", change: 0, previous: null, sincePrevious: null });
  });
});

describe("waistToHip", () => {
  it("divide cintura por quadril com 2 casas", () => {
    expect(waistToHip({ waist: 85, hip: 100 })).toBe(0.85);
    expect(waistToHip({ waist: 85 })).toBeNull();
  });
});
