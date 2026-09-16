import { describe, expect, it } from "vitest";
import { elapsedSeconds, isPaused } from "./session-timing";

const S = 1000; // ms por segundo

describe("elapsedSeconds", () => {
  it("sem pausa: tempo é agora − início", () => {
    const start = 1_000_000;
    expect(elapsedSeconds({ startedAtMs: start, pausedSeconds: 0, pausedAtMs: null }, start + 90 * S)).toBe(90);
  });

  it("desconta pausas acumuladas", () => {
    const start = 0;
    // 10 min decorridos, 3 min já pausados → 7 min efetivos
    expect(elapsedSeconds({ startedAtMs: start, pausedSeconds: 180, pausedAtMs: null }, 600 * S)).toBe(420);
  });

  it("enquanto pausado, o tempo não avança", () => {
    const start = 0;
    // pausou aos 5 min; agora são 8 min → efetivo congela em 5 min
    const t = { startedAtMs: start, pausedSeconds: 0, pausedAtMs: 300 * S };
    expect(elapsedSeconds(t, 300 * S)).toBe(300);
    expect(elapsedSeconds(t, 480 * S)).toBe(300); // 3 min depois, ainda 5 min
  });

  it("pausa aberta soma com pausas anteriores", () => {
    const start = 0;
    // já pausou 2 min antes; pausou de novo aos 10 min; agora 12 min
    const t = { startedAtMs: start, pausedSeconds: 120, pausedAtMs: 600 * S };
    expect(elapsedSeconds(t, 720 * S)).toBe(600 - 120); // 480s
  });

  it("nunca retorna negativo", () => {
    expect(elapsedSeconds({ startedAtMs: 1000 * S, pausedSeconds: 0, pausedAtMs: null }, 0)).toBe(0);
  });
});

describe("isPaused", () => {
  it("true quando há pausedAtMs", () => {
    expect(isPaused({ pausedAtMs: 123 })).toBe(true);
    expect(isPaused({ pausedAtMs: null })).toBe(false);
  });
});
