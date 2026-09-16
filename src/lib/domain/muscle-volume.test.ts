import { describe, expect, it } from "vitest";
import { analyzeMuscleVolume, volumeStatus } from "./muscle-volume";

describe("volumeStatus", () => {
  it("classifica abaixo, dentro e acima da faixa", () => {
    const t = { min: 10, max: 20 };
    expect(volumeStatus(9, t)).toBe("below");
    expect(volumeStatus(10, t)).toBe("within");
    expect(volumeStatus(20, t)).toBe("within");
    expect(volumeStatus(21, t)).toBe("above");
  });
});

describe("analyzeMuscleVolume", () => {
  it("lista só grupos com alvo e com séries feitas ou planejadas", () => {
    const rows = analyzeMuscleVolume({ CHEST: 12, CARDIO: 3 }, { CHEST: 12, BACK: 6 });
    expect(rows.map((r) => r.group).sort()).toEqual(["BACK", "CHEST"]);
  });

  it("coloca primeiro o que a ficha deixa abaixo da faixa", () => {
    const rows = analyzeMuscleVolume({}, { CHEST: 14, BACK: 6, QUADS: 24 });
    expect(rows.map((r) => r.group)).toEqual(["BACK", "QUADS", "CHEST"]);
    expect(rows[0].plannedStatus).toBe("below");
    expect(rows[1].plannedStatus).toBe("above");
  });

  it("status do feito é independente do planejado", () => {
    const [row] = analyzeMuscleVolume({ CHEST: 4 }, { CHEST: 12 });
    expect(row.status).toBe("below");
    expect(row.plannedStatus).toBe("within");
  });
});
