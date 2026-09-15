import { describe, expect, it } from "vitest";
import { compatibleUnits, convertQuantity, measuresFor, toBaseQuantity } from "./units";

describe("compatibleUnits", () => {
  it("massa oferece g e kg", () => {
    expect(compatibleUnits("G")).toEqual(["G", "KG"]);
    expect(compatibleUnits("KG")).toEqual(["G", "KG"]);
  });

  it("volume oferece ml e L", () => {
    expect(compatibleUnits("ML")).toEqual(["ML", "L"]);
    expect(compatibleUnits("L")).toEqual(["ML", "L"]);
  });

  it("unidade e porção não têm alternativas", () => {
    expect(compatibleUnits("UNIT")).toEqual(["UNIT"]);
    expect(compatibleUnits("PORTION")).toEqual(["PORTION"]);
  });
});

describe("convertQuantity", () => {
  it("kg → g", () => {
    expect(convertQuantity(1.5, "KG", "G")).toBe(1500);
  });

  it("g → kg", () => {
    expect(convertQuantity(250, "G", "KG")).toBe(0.25);
  });

  it("L → ml", () => {
    expect(convertQuantity(2, "L", "ML")).toBe(2000);
  });

  it("mesma unidade não altera", () => {
    expect(convertQuantity(100, "G", "G")).toBe(100);
    expect(convertQuantity(3, "UNIT", "UNIT")).toBe(3);
  });
});

describe("measuresFor", () => {
  it("massa oferece g, kg", () => {
    const ms = measuresFor({ name: "Arroz branco cozido", unit: "G" });
    expect(ms.map((m) => m.label)).toEqual(["g", "kg"]);
  });

  it("whey Growth oferece scoop de 30 g", () => {
    const ms = measuresFor({ name: "Whey Growth concentrado 80% natural", unit: "G" });
    const labels = ms.map((m) => m.label);
    expect(labels).toContain("g");
    expect(labels).toContain("kg");
    expect(labels).toContain("scoop");
    const scoop = ms.find((m) => m.label === "scoop")!;
    // base é g → 1 scoop = 30 g
    expect(scoop.toBase).toBe(30);
    expect(toBaseQuantity(1, scoop)).toBe(30); // 1 scoop → 30 g
    expect(toBaseQuantity(2, scoop)).toBe(60);
  });

  it("creatina: 1 scoop = 3 g", () => {
    const ms = measuresFor({ name: "Creatina monohidratada", unit: "G" });
    const scoop = ms.find((m) => m.label === "scoop")!;
    expect(toBaseQuantity(1, scoop)).toBe(3);
  });

  it("azeite (ml) oferece colheres e fio", () => {
    const ms = measuresFor({ name: "Azeite de oliva extravirgem", unit: "ML" });
    const labels = ms.map((m) => m.label);
    expect(labels).toContain("ml");
    expect(labels).toContain("L");
    expect(labels).toContain("colher (sopa)");
    const colher = ms.find((m) => m.label === "colher (sopa)")!;
    expect(toBaseQuantity(1, colher)).toBe(13); // 1 colher de sopa ≈ 13 ml
  });

  it("alimento em unidade não ganha medidas caseiras", () => {
    const ms = measuresFor({ name: "Ovo de galinha cozido", unit: "UNIT" });
    expect(ms.map((m) => m.label)).toEqual(["un"]);
  });
});
