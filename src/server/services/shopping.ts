import "server-only";
import { db } from "../db";
import { getSettings } from "../session";
import { addDays, fromDbDate, todayIn, toDbDate } from "@/lib/dates";
import { buildShoppingList } from "@/lib/domain/shopping-list";

export const SHOPPING_SOURCE_DAYS = [1, 3, 7, 14, 30] as const;

/** Em períodos curtos tudo conta; a partir de 7 dias ignora o que foi comido uma vez só. */
export function minDaysEatenFor(sourceDays: number) {
  return sourceDays < 7 ? 1 : 2;
}
export const SHOPPING_TARGET_DAYS = [7, 14, 30] as const;

/** Lista de compras pelo diário dos últimos `sourceDays` dias completos (sem hoje). */
export async function getShoppingList(userId: string, sourceDays: number, targetDays: number) {
  const settings = await getSettings(userId);
  const end = addDays(todayIn(settings.timezone), -1);
  const start = addDays(end, -(sourceDays - 1));

  const rows = await db.mealFood.findMany({
    where: { meal: { userId, date: { gte: toDbDate(start), lte: toDbDate(end) } } },
    select: { quantity: true, meal: { select: { date: true } }, food: { select: { id: true, name: true, unit: true } } },
  });

  const items = buildShoppingList(
    rows.map((r) => ({ foodId: r.food.id, name: r.food.name, unit: r.food.unit, quantity: r.quantity, date: fromDbDate(r.meal.date) })),
    { sourceDays, targetDays, minDaysEaten: minDaysEatenFor(sourceDays) },
  );
  const loggedDays = new Set(rows.map((r) => fromDbDate(r.meal.date))).size;
  return { items, start, end, loggedDays };
}
