import { describe, expect, it } from "vitest";
import { buildShoppingList, shoppingListText, toMarketQuantity, type ConsumedItem } from "./shopping-list";

const item = (foodId: string, name: string, quantity: number, date: string, unit: ConsumedItem["unit"] = "G"): ConsumedItem => ({ foodId, name, unit, quantity, date });

describe("toMarketQuantity", () => {
  it("arredonda para cima em múltiplos de 50 g ou kg com 1 casa", () => {
    expect(toMarketQuantity(120, "G")).toEqual({ amount: 150, unit: "g" });
    expect(toMarketQuantity(10, "G")).toEqual({ amount: 50, unit: "g" });
    expect(toMarketQuantity(1340, "G")).toEqual({ amount: 1.4, unit: "kg" });
    expect(toMarketQuantity(1.2, "L")).toEqual({ amount: 1.2, unit: "L" });
    expect(toMarketQuantity(13.2, "UNIT")).toEqual({ amount: 14, unit: "un" });
  });
});

describe("buildShoppingList", () => {
  it("usa a média diária do período × dias da compra", () => {
    const list = buildShoppingList(
      [
        item("f", "Peito de frango grelhado", 200, "2026-09-10"),
        item("f", "Peito de frango grelhado", 150, "2026-09-11"),
        item("f", "Peito de frango grelhado", 150, "2026-09-12"),
        item("o", "Ovo", 3, "2026-09-10", "UNIT"),
        item("o", "Ovo", 3, "2026-09-12", "UNIT"),
      ],
      { sourceDays: 7, targetDays: 7 },
    );
    expect(list).toEqual([
      { foodId: "o", name: "Ovo", amount: 6, unit: "un", daysEaten: 2, cooked: false },
      { foodId: "f", name: "Peito de frango grelhado", amount: 500, unit: "g", daysEaten: 3, cooked: true },
    ]);
  });

  it("escala para outro número de dias e ignora o que foi comido só uma vez", () => {
    const list = buildShoppingList(
      [item("a", "Aveia", 50, "2026-09-10"), item("a", "Aveia", 50, "2026-09-11"), item("p", "Pizza", 400, "2026-09-12")],
      { sourceDays: 7, targetDays: 14 },
    );
    expect(list.map((i) => [i.name, i.amount, i.unit])).toEqual([["Aveia", 200, "g"]]);
  });
});

describe("shoppingListText", () => {
  it("gera texto com caixas de marcar", () => {
    const text = shoppingListText([{ foodId: "a", name: "Aveia", amount: 1.5, unit: "kg", daysEaten: 5, cooked: false }], 7);
    expect(text).toContain("☐ Aveia — 1,5 kg");
  });
});
