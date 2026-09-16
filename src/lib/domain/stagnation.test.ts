import { describe, expect, it } from "vitest";
import { detectStagnation, type ExerciseSessionLike } from "./stagnation";

/** Uma sessão com 3 séries iguais. */
function s(date: string, weight: number, reps: number, rir?: number): ExerciseSessionLike {
  return { date, sets: Array.from({ length: 3 }, () => ({ weight, repetitions: reps, rir })) };
}

describe("detectStagnation", () => {
  it("poucos treinos: insufficient", () => {
    const r = detectStagnation([s("2026-09-01", 50, 10), s("2026-09-03", 50, 10)]);
    expect(r.status).toBe("insufficient");
  });

  it("carga ou reps subindo: progressing", () => {
    const r = detectStagnation([
      s("2026-09-01", 50, 8),
      s("2026-09-04", 50, 9),
      s("2026-09-08", 50, 10),
      s("2026-09-11", 52.5, 9),
    ]);
    expect(r.status).toBe("progressing");
    expect(r.sessionsSinceImprovement).toBe(0);
  });

  it("3 treinos seguidos sem superar o melhor: stalled com deload", () => {
    const r = detectStagnation(
      [s("2026-09-01", 50, 8), s("2026-09-04", 60, 8), s("2026-09-08", 60, 8), s("2026-09-11", 60, 7), s("2026-09-15", 60, 8)],
      { stepKg: 2.5, repMin: 6, repMax: 8 },
    );
    expect(r.status).toBe("stalled");
    expect(r.sessionsSinceImprovement).toBe(3);
    expect(r.deloadWeight).toBe(55); // 60 × 0,9 = 54 → passo 2,5
    expect(r.tips.map((t) => t.kind)).toEqual(["deload", "reps"]);
    expect(r.tips[1].text).toContain("10–12");
  });

  it("ordem de entrada não importa", () => {
    const list = [s("2026-09-15", 60, 8), s("2026-09-01", 50, 8), s("2026-09-11", 60, 7), s("2026-09-04", 60, 8), s("2026-09-08", 60, 8)];
    expect(detectStagnation(list).status).toBe("stalled");
  });

  it("ganho abaixo do mínimo não zera o contador", () => {
    const r = detectStagnation([s("2026-09-01", 100, 5), s("2026-09-04", 100, 5), s("2026-09-08", 100.2, 5), s("2026-09-11", 100, 5)]);
    expect(r.sessionsSinceImprovement).toBe(3);
  });

  it("queda ≥ 5% nas últimas sessões: regressing com dica de recuperação", () => {
    const r = detectStagnation([s("2026-09-01", 80, 8), s("2026-09-04", 80, 6), s("2026-09-08", 75, 6), s("2026-09-11", 75, 5)]);
    expect(r.status).toBe("regressing");
    expect(r.tips.some((t) => t.kind === "recovery")).toBe(true);
  });

  it("platô longo sugere trocar a variação e avisa sobre falha", () => {
    const r = detectStagnation([
      s("2026-08-01", 60, 8, 0),
      s("2026-08-05", 60, 8, 0),
      s("2026-08-09", 60, 8, 1),
      s("2026-08-13", 60, 8, 0),
      s("2026-08-17", 60, 8, 1),
      s("2026-08-21", 60, 8, 0),
    ]);
    expect(r.sessionsSinceImprovement).toBe(5);
    expect(r.tips.some((t) => t.kind === "variation")).toBe(true);
    expect(r.tips[0].text).toContain("RIR");
  });

  it("ignora séries sem carga", () => {
    const r = detectStagnation([s("2026-09-01", 0, 20), s("2026-09-02", 0, 20), s("2026-09-03", 0, 20), s("2026-09-04", 0, 20)]);
    expect(r.status).toBe("insufficient");
  });
});
