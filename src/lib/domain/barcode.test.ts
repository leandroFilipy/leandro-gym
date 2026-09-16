import { describe, expect, it } from "vitest";
import { isValidBarcode, normalizeBarcode, offProductToFood } from "./barcode";

describe("isValidBarcode", () => {
  it("aceita EAN-13 e EAN-8 com dígito verificador correto", () => {
    expect(isValidBarcode("7891000100103")).toBe(true); // Leite Moça
    expect(isValidBarcode("96385074")).toBe(true);
  });

  it("rejeita dígito verificador errado e tamanhos inválidos", () => {
    expect(isValidBarcode("7891000100104")).toBe(false);
    expect(isValidBarcode("12345")).toBe(false);
    expect(isValidBarcode("abc")).toBe(false);
  });
});

describe("normalizeBarcode", () => {
  it("remove espaços e traços", () => {
    expect(normalizeBarcode(" 789-1000 100103 ")).toBe("7891000100103");
  });
});

describe("offProductToFood", () => {
  it("converte nutrientes por 100 g e junta a marca ao nome", () => {
    const f = offProductToFood({
      product_name: "Whey Protein Concentrado",
      brands: "Growth, Growth Supplements",
      quantity: "1 kg",
      nutriments: { "energy-kcal_100g": 400.4, proteins_100g: 80.04, carbohydrates_100g: 6.66, fat_100g: 6.1 },
    });
    expect(f).toEqual({
      name: "Whey Protein Concentrado (Growth)",
      servingSize: 100,
      unit: "G",
      kcal: 400,
      protein: 80,
      carbs: 6.7,
      fat: 6.1,
      imageUrl: null,
    });
  });

  it("prefere o nome em português, detecta líquido e converte kJ", () => {
    const f = offProductToFood({
      product_name: "Milk",
      product_name_pt: "Leite integral",
      quantity: "1 L",
      nutriments: { energy_100g: 251 },
    });
    expect(f?.name).toBe("Leite integral");
    expect(f?.unit).toBe("ML");
    expect(f?.kcal).toBe(60);
  });

  it("sem nome ou sem energia: null", () => {
    expect(offProductToFood({ nutriments: { "energy-kcal_100g": 100 } })).toBeNull();
    expect(offProductToFood({ product_name: "X", nutriments: {} })).toBeNull();
  });
});
