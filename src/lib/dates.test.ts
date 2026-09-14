import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  fromDbDate,
  isoWeekday,
  isValidDateStr,
  startOfIsoWeek,
  toDbDate,
} from "./dates";

describe("addDays", () => {
  it("soma e subtrai dias", () => {
    expect(addDays("2026-01-01", 1)).toBe("2026-01-02");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("atravessa a virada de mês/ano", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 não é bissexto
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("daysBetween", () => {
  it("conta os dias entre duas datas", () => {
    expect(daysBetween("2026-01-01", "2026-01-08")).toBe(7);
    expect(daysBetween("2026-01-08", "2026-01-01")).toBe(-7);
  });
});

describe("isoWeekday", () => {
  it("segunda = 1 e domingo = 7", () => {
    expect(isoWeekday("2026-01-05")).toBe(1); // segunda
    expect(isoWeekday("2026-01-11")).toBe(7); // domingo
  });
});

describe("startOfIsoWeek", () => {
  it("volta para a segunda-feira da semana", () => {
    expect(startOfIsoWeek("2026-01-07")).toBe("2026-01-05"); // quarta → segunda
    expect(startOfIsoWeek("2026-01-05")).toBe("2026-01-05"); // já é segunda
  });
});

describe("toDbDate / fromDbDate", () => {
  it("faz o round-trip preservando a data", () => {
    expect(fromDbDate(toDbDate("2026-06-15"))).toBe("2026-06-15");
  });

  it("toDbDate usa meia-noite UTC", () => {
    expect(toDbDate("2026-06-15").toISOString()).toBe("2026-06-15T00:00:00.000Z");
  });
});

describe("isValidDateStr", () => {
  it("aceita YYYY-MM-DD válido", () => {
    expect(isValidDateStr("2026-06-15")).toBe(true);
  });

  it("rejeita formatos inválidos", () => {
    expect(isValidDateStr("15/06/2026")).toBe(false);
    expect(isValidDateStr("2026-6-5")).toBe(false);
    expect(isValidDateStr("abc")).toBe(false);
  });
});
