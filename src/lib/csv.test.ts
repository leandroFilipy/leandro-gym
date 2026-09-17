import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("usa ; e vírgula decimal, com BOM", () => {
    const csv = toCsv(["data", "peso_kg"], [["2026-09-17", 80.55]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("data;peso_kg\r\n2026-09-17;80,55\r\n");
  });

  it("escapa aspas, ponto e vírgula e quebra de linha", () => {
    expect(toCsv(["a"], [['Arroz; "tipo 1"']])).toContain('"Arroz; ""tipo 1"""');
  });

  it("neutraliza fórmulas", () => {
    expect(toCsv(["a"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK(1)");
  });

  it("vazio para null/undefined", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toContain("\r\n;\r\n");
  });
});
