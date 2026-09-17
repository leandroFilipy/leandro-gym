import { describe, expect, it } from "vitest";
import { liftKeyFor, relativeStrength } from "./strength";

describe("liftKeyFor", () => {
  it("reconhece os levantamentos principais pelo nome", () => {
    expect(liftKeyFor("Supino reto")).toBe("bench");
    expect(liftKeyFor("Agachamento Livre")).toBe("squat");
    expect(liftKeyFor("Levantamento terra")).toBe("deadlift");
    expect(liftKeyFor("Desenvolvimento militar")).toBe("ohp");
    expect(liftKeyFor("Elevação pélvica")).toBe("hipThrust");
    expect(liftKeyFor("Leg press 45°")).toBe("legPress");
  });

  it("ignora variações sem padrão comparável", () => {
    expect(liftKeyFor("Supino inclinado com halteres")).toBeNull();
    expect(liftKeyFor("Agachamento búlgaro")).toBeNull();
    expect(liftKeyFor("Stiff")).toBeNull();
    expect(liftKeyFor("Cadeira extensora")).toBeNull();
  });
});

describe("relativeStrength", () => {
  it("calcula razão, nível e carga para o próximo nível", () => {
    const r = relativeStrength("Supino reto", 100, 80, "MALE")!;
    expect(r.ratio).toBeCloseTo(1.25);
    expect(r.level).toBe("Intermediário");
    expect(r.progress).toBeCloseTo(0.5);
    expect(r.nextLevel).toEqual({ level: "Avançado", oneRm: 120 });
  });

  it("usa a tabela feminina quando informada", () => {
    expect(relativeStrength("Supino reto", 60, 60, "FEMALE")!.level).toBe("Avançado");
  });

  it("Elite não tem próximo nível", () => {
    const r = relativeStrength("Levantamento terra", 250, 80, "MALE")!;
    expect(r.level).toBe("Elite");
    expect(r.nextLevel).toBeNull();
  });

  it("exercício sem padrão devolve só a razão", () => {
    const r = relativeStrength("Cadeira extensora", 80, 80, "MALE")!;
    expect(r.ratio).toBe(1);
    expect(r.level).toBeNull();
  });

  it("sem peso corporal não calcula", () => {
    expect(relativeStrength("Supino reto", 100, 0, "MALE")).toBeNull();
  });
});
