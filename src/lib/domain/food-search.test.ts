import { describe, expect, it } from "vitest";
import { foodMatches } from "./food-search";

describe("foodMatches", () => {
  it("buscar 'carne' acha cortes bovinos sem a palavra carne", () => {
    for (const nome of ["Picanha sem gordura grelhada", "Alcatra sem gordura grelhada", "Costela bovina assada", "Fraldinha grelhada", "Cupim assado"]) {
      expect(foodMatches(nome, "carne")).toBe(true);
    }
  });

  it("buscar 'carne' também acha frango, porco e peixe", () => {
    expect(foodMatches("Coxa de frango com pele assada", "carne")).toBe(true);
    expect(foodMatches("Bisteca suína grelhada", "carne")).toBe(true);
    expect(foodMatches("Salmão grelhado", "carne")).toBe(true);
  });

  it("buscar 'boi'/'bovino' acha cortes de boi", () => {
    expect(foodMatches("Picanha com gordura grelhada", "boi")).toBe(true);
    expect(foodMatches("Maminha grelhada", "bovino")).toBe(true);
  });

  it("buscar 'frango' acha coxa e sobrecoxa", () => {
    expect(foodMatches("Coxa de frango sem pele grelhada", "frango")).toBe(true);
    expect(foodMatches("Sobrecoxa de frango com pele assada", "frango")).toBe(true);
  });

  it("buscar 'porco' acha cortes suínos", () => {
    expect(foodMatches("Lombo suíno assado", "porco")).toBe(true);
    expect(foodMatches("Panceta suína frita", "porco")).toBe(true);
  });

  it("ainda casa por nome direto", () => {
    expect(foodMatches("Arroz branco cozido", "arroz")).toBe(true);
    expect(foodMatches("Banana prata", "banana")).toBe(true);
  });

  it("não casa termos não relacionados", () => {
    expect(foodMatches("Arroz branco cozido", "carne")).toBe(false);
    expect(foodMatches("Banana prata", "frango")).toBe(false);
  });

  it("termo vazio casa tudo", () => {
    expect(foodMatches("Qualquer", "")).toBe(true);
  });
});
