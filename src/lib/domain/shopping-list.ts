import type { FoodUnit } from "./units";

// Lista de compras a partir do que foi realmente comido: média diária de cada alimento no
// período de base × dias que a compra precisa cobrir, arredondada para quantidades de mercado.

export interface ConsumedItem {
  foodId: string;
  name: string;
  unit: FoodUnit;
  quantity: number; // na unidade do alimento
  date: string; // YYYY-MM-DD
}

export interface ShoppingItem {
  foodId: string;
  name: string;
  /** Quantidade já arredondada, na unidade de exibição. */
  amount: number;
  unit: "g" | "kg" | "ml" | "L" | "un" | "porções";
  /** Em quantos dias do período o alimento apareceu. */
  daysEaten: number;
  /** Peso do alimento pronto (cozido/grelhado): a compra crua é diferente. */
  cooked: boolean;
}

export interface ShoppingOptions {
  sourceDays: number; // período observado
  targetDays: number; // dias que a compra deve cobrir
  minDaysEaten?: number; // ignora o que foi comido só uma vez (padrão 2)
}

const COOKED = /\b(cozid|grelhad|assad|frit|refogad|pront)/i;

const ceilTo = (n: number, step: number) => Math.ceil(n / step - 1e-9) * step;

/** Massa/volume em g ou ml → quantidade de mercado (múltiplos de 50 g, ou kg com 1 casa). */
function roundMarket(base: number, big: "kg" | "L", small: "g" | "ml"): Pick<ShoppingItem, "amount" | "unit"> {
  if (base >= 1000) return { amount: Math.round(ceilTo(base / 1000, 0.1) * 10) / 10, unit: big };
  return { amount: Math.max(50, ceilTo(base, 50)), unit: small };
}

export function toMarketQuantity(quantity: number, unit: FoodUnit): Pick<ShoppingItem, "amount" | "unit"> {
  switch (unit) {
    case "G":
      return roundMarket(quantity, "kg", "g");
    case "KG":
      return roundMarket(quantity * 1000, "kg", "g");
    case "ML":
      return roundMarket(quantity, "L", "ml");
    case "L":
      return roundMarket(quantity * 1000, "L", "ml");
    case "UNIT":
      return { amount: Math.max(1, Math.ceil(quantity - 1e-9)), unit: "un" };
    case "PORTION":
      return { amount: Math.max(1, Math.ceil(quantity - 1e-9)), unit: "porções" };
  }
}

export function buildShoppingList(items: readonly ConsumedItem[], opts: ShoppingOptions): ShoppingItem[] {
  const sourceDays = Math.max(1, opts.sourceDays);
  const minDays = opts.minDaysEaten ?? 2;
  const byFood = new Map<string, { name: string; unit: FoodUnit; total: number; dates: Set<string> }>();

  for (const i of items) {
    if (!(i.quantity > 0)) continue;
    const entry = byFood.get(i.foodId) ?? { name: i.name, unit: i.unit, total: 0, dates: new Set<string>() };
    entry.total += i.quantity;
    entry.dates.add(i.date);
    byFood.set(i.foodId, entry);
  }

  const list: ShoppingItem[] = [];
  for (const [foodId, e] of byFood) {
    if (e.dates.size < minDays) continue;
    const needed = (e.total / sourceDays) * opts.targetDays;
    list.push({ foodId, name: e.name, daysEaten: e.dates.size, cooked: COOKED.test(e.name), ...toMarketQuantity(needed, e.unit) });
  }
  return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/** Texto para compartilhar (WhatsApp, notas…). */
export function shoppingListText(list: readonly ShoppingItem[], targetDays: number): string {
  const lines = list.map((i) => `☐ ${i.name} — ${i.amount.toLocaleString("pt-BR")} ${i.unit}${i.cooked ? " (pronto)" : ""}`);
  return [`🛒 Lista de compras (${targetDays} dias)`, "", ...lines].join("\n");
}
