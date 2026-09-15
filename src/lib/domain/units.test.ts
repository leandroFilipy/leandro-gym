import { describe, expect, it } from "vitest";
import { compatibleUnits, convertQuantity } from "./units";

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
