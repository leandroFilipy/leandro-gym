import { describe, expect, it } from "vitest";
import { LOGIN_EMAIL_POLICY, lockedMinutes, registerFailure, type ThrottleState } from "./throttle";

const t0 = new Date("2026-09-17T12:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);

function failTimes(n: number, start: ThrottleState | null = null, minuteStep = 0) {
  let s = start;
  for (let i = 0; i < n; i++) s = registerFailure(s, at(i * minuteStep), LOGIN_EMAIL_POLICY);
  return s!;
}

describe("throttle", () => {
  it("4 falhas não bloqueiam; a 5ª bloqueia por 15 min", () => {
    expect(failTimes(4).lockedUntil).toBeNull();
    const s = failTimes(5);
    expect(lockedMinutes(s, at(0))).toBe(15);
    expect(lockedMinutes(s, at(14.5))).toBe(1);
    expect(lockedMinutes(s, at(15))).toBeNull();
  });

  it("falhas fora da janela de 15 min recomeçam a contagem", () => {
    const s = failTimes(4, null, 5); // minutos 0, 5, 10, 15
    const next = registerFailure(s, at(16), LOGIN_EMAIL_POLICY);
    expect(next.failures).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });

  it("depois que o bloqueio expira, a contagem recomeça", () => {
    const locked = failTimes(5);
    const after = registerFailure(locked, at(16), LOGIN_EMAIL_POLICY);
    expect(after.failures).toBe(1);
    expect(lockedMinutes(after, at(16))).toBeNull();
  });

  it("sem estado não está bloqueado", () => {
    expect(lockedMinutes(null, t0)).toBeNull();
  });
});
