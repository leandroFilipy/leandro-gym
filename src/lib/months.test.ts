import { describe, expect, it } from "vitest";
import { addMonths, isValidMonth, monthOf, monthRange } from "./dates";

describe("meses", () => {
  it("valida YYYY-MM", () => {
    expect(isValidMonth("2026-09")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-9")).toBe(false);
  });

  it("soma meses atravessando o ano", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-09", -13)).toBe("2025-08");
  });

  it("intervalo do mês, inclusive fevereiro bissexto", () => {
    expect(monthRange("2026-09")).toEqual({ start: "2026-09-01", end: "2026-09-30" });
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthOf("2026-09-17")).toBe("2026-09");
  });
});
